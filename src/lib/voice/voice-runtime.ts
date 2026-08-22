import {
	ConnectionState,
	type LocalTrackPublication,
	type RemoteParticipant,
	type RemoteTrackPublication,
	Room,
	RoomEvent,
	Track,
} from "livekit-client";
import type { Channel } from "stoat.js";
import { getStoatClient } from "@/lib/stoat-client";
import {
	canPublishDeafenAttribute,
	deafenAttributePayload,
	isOwnMetadataPermissionError,
	participantIsDeafened,
} from "@/lib/voice/deafen-attribute";
import {
	type LivekitNode,
	pickLivekitNode,
} from "@/lib/voice/pick-livekit-node";
import {
	IDLE_VOICE_SESSION,
	type VoiceRoomParticipantSnapshot,
	type VoiceSessionSnapshot,
} from "@/lib/voice/types";
import {
	patchVoicePrefs,
	readVoicePrefs,
} from "@/lib/voice/voice-prefs-bridge";
import {
	applyScreenShareWatchAction,
	deriveVoiceVideoSnapshot,
	IDLE_VOICE_VIDEO,
	isWatchingScreenShare,
	SCREEN_SHARE_SOURCES,
	type VoiceVideoSnapshot,
	type VoiceVideoSource,
	type VoiceVideoSurfaceDescriptor,
	voiceVideoSurfaceId,
} from "@/lib/voice/voice-video-types";

type WakeLockSentinelLike = {
	release: () => Promise<void>;
};

function livekitNodesFromClient(): LivekitNode[] {
	const client = getStoatClient();
	const livekit = client.configuration?.features.livekit;
	if (!livekit?.enabled || !Array.isArray(livekit.nodes)) {
		return [];
	}
	const nodes: LivekitNode[] = [];
	for (const node of livekit.nodes) {
		if (
			typeof node?.name === "string" &&
			typeof node?.public_url === "string" &&
			node.public_url.length > 0
		) {
			nodes.push({ name: node.name, public_url: node.public_url });
		}
	}
	return nodes;
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (typeof error === "string" && error.length > 0) {
		return error;
	}
	return "Voice connection failed";
}

function channelDisplayName(channel: Channel): string {
	try {
		return channel.displayName || channel.name || "Voice";
	} catch {
		try {
			return channel.name || "Voice";
		} catch {
			return "Voice";
		}
	}
}

type VideoTrackLike = {
	attach: (element: HTMLMediaElement) => HTMLMediaElement;
	detach: (element: HTMLMediaElement) => HTMLMediaElement;
	mediaStreamTrack: MediaStreamTrack;
};

function liveVideoTrack(
	publication:
		| {
				isMuted: boolean;
				videoTrack?: VideoTrackLike;
		  }
		| undefined,
): VideoTrackLike | undefined {
	if (
		!publication ||
		publication.isMuted ||
		!publication.videoTrack ||
		publication.videoTrack.mediaStreamTrack.readyState === "ended"
	) {
		return undefined;
	}
	return publication.videoTrack;
}

/**
 * Exclusive LiveKit voice runtime. Owns the Room; React only sees snapshots.
 */
export class VoiceRuntime {
	#listeners = new Set<() => void>();
	#videoListeners = new Set<() => void>();
	#snapshot: VoiceSessionSnapshot = IDLE_VOICE_SESSION;
	#videoSnapshot: VoiceVideoSnapshot = IDLE_VOICE_VIDEO;
	#room: Room | undefined;
	#channel: Channel | undefined;
	#connectSession = 0;
	#audioToggleInFlight: Promise<void> = Promise.resolve();
	#screenshareToggleInFlight: Promise<void> = Promise.resolve();
	#applyingMicFromRoom = false;
	#wakeLock: WakeLockSentinelLike | null = null;
	#micAudioElements = new Map<string, HTMLAudioElement>();
	#screenShareAudioElements = new Map<string, HTMLAudioElement>();
	#watchingLive = new Set<string>();
	#videoTracks = new Map<string, VideoTrackLike | undefined>();
	#videoGenerations = new Map<string, number>();
	#videoElements = new Map<string, HTMLVideoElement>();
	#attachedVideoTracks = new Map<
		string,
		{ element: HTMLVideoElement; track: VideoTrackLike }
	>();
	#localScreenShareTrack: MediaStreamTrack | undefined;
	#localScreenShareEnded: (() => void) | undefined;

	subscribe(listener: () => void): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	getSnapshot(): VoiceSessionSnapshot {
		return this.#snapshot;
	}

	subscribeVideo(listener: () => void): () => void {
		this.#videoListeners.add(listener);
		return () => {
			this.#videoListeners.delete(listener);
		};
	}

	getVideoSnapshot(): VoiceVideoSnapshot {
		return this.#videoSnapshot;
	}

	attachVideoSurface(id: string, element: HTMLVideoElement | null): void {
		const previous = this.#videoElements.get(id);
		if (previous && previous !== element) {
			this.#detachVideoTrack(id, previous);
		}
		if (!element) {
			this.#videoElements.delete(id);
			return;
		}
		this.#videoElements.set(id, element);
		this.#attachVideoTrack(id, element);
	}

	async connect(channelId: string): Promise<void> {
		await this.disconnect();
		const session = ++this.#connectSession;

		const client = getStoatClient();
		const channel =
			client.channels.get(channelId) ??
			(await client.channels.fetch(channelId));

		if (!channel.isVoice) {
			this.#publish({
				...IDLE_VOICE_SESSION,
				error: "This channel does not support voice",
			});
			return;
		}

		await this.#acquireWakeLock();

		const prefs = readVoicePrefs();
		const room = new Room({
			audioCaptureDefaults: {
				echoCancellation: prefs.echoCancellation,
				noiseSuppression: prefs.noiseSuppression === "browser",
				autoGainControl: prefs.autoGainControl,
				voiceIsolation: prefs.noiseSuppression === "browser",
			},
			publishDefaults: {
				screenShareSimulcastLayers: [],
				degradationPreference: "maintain-framerate",
			},
		});

		this.#room = room;
		this.#channel = channel;
		this.#publish({
			phase: "connecting",
			channelId: channel.id,
			channelName: channelDisplayName(channel),
			localIdentity: null,
			error: null,
			microphone: prefs.micOn && !prefs.deafen,
			deafen: prefs.deafen,
			canSpeak: this.#canSpeak(channel),
			cameraEnabled: false,
			screenshareEnabled: false,
			hasVideoStage: false,
			participants: [],
		});

		this.#wireRoom(room);

		try {
			const nodes = livekitNodesFromClient();
			const selected = await pickLivekitNode(nodes);
			if (session !== this.#connectSession) {
				return;
			}

			const auth = await channel.joinCall(selected);
			if (session !== this.#connectSession) {
				return;
			}

			await room.connect(auth.url, auth.token, { autoSubscribe: false });
			if (session !== this.#connectSession) {
				await room.disconnect();
			}
		} catch (error) {
			if (session === this.#connectSession) {
				this.#publish({
					...this.#snapshot,
					error: errorMessage(error),
				});
				await this.disconnect();
			}
		}
	}

	async disconnect(): Promise<void> {
		this.#connectSession++;
		await this.#releaseWakeLock();
		this.#watchingLive.clear();
		this.#clearLocalScreenShareEndedListener();
		this.#clearVideoSurfaces();
		this.#clearScreenShareAudioElements();

		const room = this.#room;
		const channel = this.#channel;
		const localId = room?.localParticipant?.identity;
		if (channel && localId) {
			channel.voiceParticipants.delete(localId);
		}

		this.#clearMicAudioElements();

		if (!room) {
			this.#channel = undefined;
			this.#publishVideoSnapshot(IDLE_VOICE_VIDEO);
			this.#publish({
				...IDLE_VOICE_SESSION,
				microphone: readVoicePrefs().micOn && !readVoicePrefs().deafen,
				deafen: readVoicePrefs().deafen,
			});
			return;
		}

		room.removeAllListeners();
		try {
			await room.disconnect(true);
		} catch {
			/* leave best-effort */
		}

		this.#room = undefined;
		this.#channel = undefined;
		const prefs = readVoicePrefs();
		this.#publishVideoSnapshot(IDLE_VOICE_VIDEO);
		this.#publish({
			...IDLE_VOICE_SESSION,
			microphone: prefs.micOn && !prefs.deafen,
			deafen: prefs.deafen,
		});
	}

	async toggleMute(): Promise<void> {
		return this.#withAudioToggle(async () => {
			if (readVoicePrefs().deafen) {
				await this.#toggleDeafenInternal(true);
				return;
			}
			const room = this.#room;
			if (!room) {
				return;
			}
			await room.localParticipant.setMicrophoneEnabled(
				!room.localParticipant.isMicrophoneEnabled,
			);
			this.#syncLocalMicFromRoom();
			this.#emitFromRoom();
		});
	}

	async toggleDeafen(): Promise<void> {
		return this.#withAudioToggle(() => this.#toggleDeafenInternal(false));
	}

	async toggleScreenshare(): Promise<void> {
		const run = this.#screenshareToggleInFlight.then(async () => {
			const room = this.#room;
			if (!room) {
				return;
			}
			const enabled = this.#isLocalScreenshareLive(room);
			try {
				await room.localParticipant.setScreenShareEnabled(
					!enabled,
					!enabled
						? {
								audio: true,
								video: true,
								contentHint: "motion",
								selfBrowserSurface: "exclude",
								systemAudio: "include",
							}
						: undefined,
					!enabled
						? {
								source: Track.Source.ScreenShare,
								degradationPreference: "maintain-framerate",
								screenShareSimulcastLayers: [],
							}
						: undefined,
				);
				this.#emitFromRoom();
			} catch (error) {
				if (!enabled) {
					const publication = room.localParticipant.getTrackPublication(
						Track.Source.ScreenShare,
					);
					if (publication?.track) {
						try {
							await room.localParticipant.unpublishTrack(
								publication.track,
								true,
							);
						} catch {
							/* the original capture error is more useful to the caller */
						}
					}
					this.#clearLocalScreenShareEndedListener();
					this.#emitFromRoom();
				}
				this.#publish({
					...this.#snapshot,
					error: this.#screenShareErrorMessage(error),
				});
			}
		});
		this.#screenshareToggleInFlight = run.catch(() => {});
		await run;
	}

	resumeWatching(participantSid: string): void {
		const participant = this.#remoteParticipantBySid(participantSid);
		if (!participant) {
			return;
		}
		this.#watchingLive = applyScreenShareWatchAction(
			this.#watchingLive,
			participantSid,
			"resume",
		);
		this.#subscribeRemoteScreenShare(participant);
		this.#emitFromRoom();
	}

	stopWatching(participantSid: string): void {
		const participant = this.#remoteParticipantBySid(participantSid);
		this.#watchingLive = applyScreenShareWatchAction(
			this.#watchingLive,
			participantSid,
			"stop",
		);
		if (participant) {
			this.#unsubscribeRemoteScreenShare(participant);
		}
		this.#detachScreenShareAudio(participantSid);
		this.#emitFromRoom();
	}

	/** Re-emit after prefs change while connected (deafen inbound mute). */
	refreshFromPrefs(): void {
		this.#emitFromRoom();
		this.#applyRemoteAudioMuteState();
	}

	#wireRoom(room: Room): void {
		room.addListener(RoomEvent.Connected, () => {
			this.#publish({
				...this.#snapshot,
				phase: "connected",
				localIdentity: room.localParticipant.identity,
				error: null,
			});
			if (this.#canSpeak(this.#channel)) {
				void this.#applyDesiredMicState();
			}
			void this.#publishDeafenAttribute();
			this.#subscribeRemoteMics(room);
			this.#emitFromRoom();
		});

		room.addListener(
			RoomEvent.ParticipantPermissionsChanged,
			(_prev, participant) => {
				if (!participant.isLocal) {
					return;
				}
				if (canPublishDeafenAttribute(room.localParticipant)) {
					void this.#publishDeafenAttribute();
				}
			},
		);

		room.addListener(RoomEvent.Disconnected, () => {
			if (this.#room !== room) {
				return;
			}
			this.#connectSession++;
			this.#watchingLive.clear();
			this.#clearLocalScreenShareEndedListener();
			this.#clearVideoSurfaces();
			this.#clearScreenShareAudioElements();
			this.#clearMicAudioElements();
			if (this.#channel) {
				this.#channel.voiceParticipants.delete(room.localParticipant.identity);
			}
			room.removeAllListeners();
			this.#room = undefined;
			this.#channel = undefined;
			const prefs = readVoicePrefs();
			this.#publishVideoSnapshot(IDLE_VOICE_VIDEO);
			this.#publish({
				...IDLE_VOICE_SESSION,
				microphone: prefs.micOn && !prefs.deafen,
				deafen: prefs.deafen,
			});
		});

		room.addListener(RoomEvent.Reconnecting, () => {
			this.#publish({ ...this.#snapshot, phase: "reconnecting" });
		});

		room.addListener(RoomEvent.Reconnected, () => {
			this.#publish({ ...this.#snapshot, phase: "connected" });
			void this.#applyDesiredMicState();
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.TrackMuted, (pub, participant) => {
			if (participant.isLocal && pub.source === Track.Source.Microphone) {
				this.#syncLocalMicFromRoom();
			}
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.TrackUnmuted, (pub, participant) => {
			if (participant.isLocal && pub.source === Track.Source.Microphone) {
				this.#syncLocalMicFromRoom();
			}
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.LocalTrackPublished, (pub) => {
			if (pub.source === Track.Source.Microphone) {
				this.#syncLocalMicFromRoom();
			}
			if (pub.source === Track.Source.ScreenShare) {
				this.#watchLocalScreenShare(pub);
			}
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.LocalTrackUnpublished, (pub) => {
			if (pub.source === Track.Source.Microphone) {
				this.#syncLocalMicFromRoom();
			}
			if (pub.source === Track.Source.ScreenShare) {
				this.#clearLocalScreenShareEndedListener();
			}
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.ParticipantConnected, () => {
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.ParticipantDisconnected, (participant) => {
			this.#detachParticipantAudio(participant.sid);
			this.#detachScreenShareAudio(participant.sid);
			this.#watchingLive.delete(participant.sid);
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.TrackPublished, (pub, participant) => {
			if (participant.isLocal) {
				return;
			}
			if (pub.source === Track.Source.Microphone) {
				this.#subscribeMicPublication(pub as RemoteTrackPublication);
			}
			if (
				pub.source === Track.Source.ScreenShare ||
				pub.source === Track.Source.ScreenShareAudio
			) {
				if (isWatchingScreenShare(this.#watchingLive, participant.sid)) {
					this.#subscribeRemoteScreenShare(participant);
				} else {
					this.#pauseRemoteScreenShare(participant);
				}
			}
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.TrackSubscribed, (track, pub, participant) => {
			if (participant.isLocal) {
				return;
			}
			if (
				track.kind === Track.Kind.Audio &&
				pub.source === Track.Source.Microphone
			) {
				this.#attachRemoteAudio(participant.sid, track.mediaStreamTrack);
			}
			if (
				track.kind === Track.Kind.Audio &&
				pub.source === Track.Source.ScreenShareAudio
			) {
				if (isWatchingScreenShare(this.#watchingLive, participant.sid)) {
					this.#attachScreenShareAudio(participant.sid, track.mediaStreamTrack);
				}
			}
			this.#emitFromRoom();
		});

		room.addListener(
			RoomEvent.TrackUnsubscribed,
			(_track, pub, participant) => {
				if (pub.source === Track.Source.Microphone) {
					this.#detachParticipantAudio(participant.sid);
				}
				if (pub.source === Track.Source.ScreenShareAudio) {
					this.#detachScreenShareAudio(participant.sid);
				}
				this.#emitFromRoom();
			},
		);

		room.addListener(RoomEvent.ActiveSpeakersChanged, () => {
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.ParticipantAttributesChanged, () => {
			this.#emitFromRoom();
		});

		room.addListener(RoomEvent.TrackUnpublished, (pub, participant) => {
			if (
				pub.source !== Track.Source.ScreenShare &&
				pub.source !== Track.Source.ScreenShareAudio
			) {
				return;
			}
			this.#watchingLive = applyScreenShareWatchAction(
				this.#watchingLive,
				participant.sid,
				"remove",
			);
			this.#detachScreenShareAudio(participant.sid);
			this.#emitFromRoom();
		});
	}

	#subscribeRemoteMics(room: Room): void {
		for (const participant of room.remoteParticipants.values()) {
			this.#pauseRemoteScreenShare(participant);
			for (const pub of participant.trackPublications.values()) {
				if (pub.source === Track.Source.Microphone) {
					this.#subscribeMicPublication(pub as RemoteTrackPublication);
				}
			}
		}
	}

	#subscribeMicPublication(pub: RemoteTrackPublication): void {
		if (!pub.isSubscribed) {
			pub.setSubscribed(true);
		}
	}

	/** Fork invariant: never auto-subscribe remote screen shares. */
	#pauseRemoteScreenShare(participant: RemoteParticipant): void {
		if (isWatchingScreenShare(this.#watchingLive, participant.sid)) {
			return;
		}
		for (const source of SCREEN_SHARE_SOURCES) {
			const pub = participant.getTrackPublication(source);
			if (pub?.isSubscribed) {
				pub.setSubscribed(false);
			}
		}
	}

	#subscribeRemoteScreenShare(participant: RemoteParticipant): void {
		for (const source of SCREEN_SHARE_SOURCES) {
			const pub = participant.getTrackPublication(source);
			if (pub && !pub.isSubscribed) {
				pub.setSubscribed(true);
			}
		}
	}

	#unsubscribeRemoteScreenShare(participant: RemoteParticipant): void {
		for (const source of SCREEN_SHARE_SOURCES) {
			const pub = participant.getTrackPublication(source);
			if (pub?.isSubscribed) {
				pub.setSubscribed(false);
			}
		}
	}

	#remoteParticipantBySid(
		participantSid: string,
	): RemoteParticipant | undefined {
		for (const participant of this.#room?.remoteParticipants.values() ?? []) {
			if (participant.sid === participantSid) {
				return participant;
			}
		}
		return undefined;
	}

	#attachRemoteAudio(
		participantSid: string,
		mediaTrack: MediaStreamTrack,
	): void {
		this.#detachParticipantAudio(participantSid);
		const element = document.createElement("audio");
		element.autoplay = true;
		element.setAttribute("data-voice-sid", participantSid);
		element.srcObject = new MediaStream([mediaTrack]);
		element.volume = Math.min(1, Math.max(0, readVoicePrefs().outputVolume));
		element.muted = readVoicePrefs().deafen;
		document.body.appendChild(element);
		this.#micAudioElements.set(participantSid, element);
		void element.play().catch(() => {});
	}

	#detachParticipantAudio(participantSid: string): void {
		const element = this.#micAudioElements.get(participantSid);
		if (!element) {
			return;
		}
		element.pause();
		element.srcObject = null;
		element.remove();
		this.#micAudioElements.delete(participantSid);
	}

	#attachScreenShareAudio(
		participantSid: string,
		mediaTrack: MediaStreamTrack,
	): void {
		this.#detachScreenShareAudio(participantSid);
		const element = document.createElement("audio");
		element.autoplay = true;
		element.setAttribute("data-voice-screen-share-sid", participantSid);
		element.srcObject = new MediaStream([mediaTrack]);
		element.volume = Math.min(1, Math.max(0, readVoicePrefs().outputVolume));
		element.muted = false;
		document.body.appendChild(element);
		this.#screenShareAudioElements.set(participantSid, element);
		void element.play().catch(() => {});
	}

	#detachScreenShareAudio(participantSid: string): void {
		const element = this.#screenShareAudioElements.get(participantSid);
		if (!element) {
			return;
		}
		element.pause();
		element.srcObject = null;
		element.remove();
		this.#screenShareAudioElements.delete(participantSid);
	}

	#clearMicAudioElements(): void {
		for (const sid of [...this.#micAudioElements.keys()]) {
			this.#detachParticipantAudio(sid);
		}
	}

	#clearScreenShareAudioElements(): void {
		for (const sid of [...this.#screenShareAudioElements.keys()]) {
			this.#detachScreenShareAudio(sid);
		}
	}

	#applyRemoteAudioMuteState(): void {
		const volume = Math.min(1, Math.max(0, readVoicePrefs().outputVolume));
		for (const element of this.#micAudioElements.values()) {
			element.muted = readVoicePrefs().deafen;
			element.volume = volume;
		}
		for (const element of this.#screenShareAudioElements.values()) {
			element.muted = false;
			element.volume = volume;
		}
	}

	#desiredMicEnabled(): boolean {
		const prefs = readVoicePrefs();
		return prefs.micOn && !prefs.deafen && this.#canSpeak(this.#channel);
	}

	#canSpeak(channel: Channel | undefined): boolean {
		if (!channel) {
			return true;
		}
		try {
			return channel.havePermission("Speak");
		} catch {
			return true;
		}
	}

	#syncLocalMicFromRoom(): void {
		if (this.#applyingMicFromRoom) {
			return;
		}
		const room = this.#room;
		if (!room) {
			return;
		}
		const prefs = readVoicePrefs();
		const liveMic = room.localParticipant.isMicrophoneEnabled;
		if (!prefs.deafen && prefs.micOn !== liveMic) {
			patchVoicePrefs({ micOn: liveMic });
		}
	}

	async #applyDesiredMicState(): Promise<void> {
		const room = this.#room;
		if (!room || !this.#canSpeak(this.#channel)) {
			return;
		}
		const desired = this.#desiredMicEnabled();
		if (room.localParticipant.isMicrophoneEnabled === desired) {
			this.#syncLocalMicFromRoom();
			return;
		}
		this.#applyingMicFromRoom = true;
		try {
			await room.localParticipant.setMicrophoneEnabled(desired);
			this.#syncLocalMicFromRoom();
		} catch (error) {
			if (
				error instanceof DOMException &&
				(error.name === "NotAllowedError" || error.name === "NotFoundError")
			) {
				patchVoicePrefs({ micOn: false });
				this.#emitFromRoom();
				return;
			}
			throw error;
		} finally {
			this.#applyingMicFromRoom = false;
		}
	}

	async #publishDeafenAttribute(
		deafened = readVoicePrefs().deafen,
	): Promise<void> {
		const room = this.#room;
		if (!room || room.state !== ConnectionState.Connected) {
			return;
		}
		if (!canPublishDeafenAttribute(room.localParticipant)) {
			return;
		}
		try {
			await room.localParticipant.setAttributes(
				deafenAttributePayload(deafened),
			);
		} catch (error) {
			if (isOwnMetadataPermissionError(error)) {
				return;
			}
		}
	}

	async #toggleDeafenInternal(fromMute?: boolean): Promise<void> {
		const room = this.#room;
		if (!room) {
			return;
		}
		const prefs = readVoicePrefs();
		await room.localParticipant.setMicrophoneEnabled(
			(prefs.micOn || !!fromMute) && !room.localParticipant.isMicrophoneEnabled,
		);
		const nextDeafen = !prefs.deafen;
		patchVoicePrefs({ deafen: nextDeafen });
		if (fromMute) {
			patchVoicePrefs({
				micOn: room.localParticipant.isMicrophoneEnabled,
			});
		} else {
			this.#syncLocalMicFromRoom();
		}
		void this.#publishDeafenAttribute(nextDeafen);
		this.#applyRemoteAudioMuteState();
		this.#emitFromRoom();
	}

	async #withAudioToggle(fn: () => Promise<void>): Promise<void> {
		const run = this.#audioToggleInFlight.then(fn);
		this.#audioToggleInFlight = run.catch(() => {});
		await run;
	}

	#isLocalScreenshareLive(room: Room): boolean {
		return Boolean(
			liveVideoTrack(
				room.localParticipant.getTrackPublication(Track.Source.ScreenShare),
			),
		);
	}

	#watchLocalScreenShare(publication: LocalTrackPublication): void {
		const mediaTrack = publication.videoTrack?.mediaStreamTrack;
		if (!mediaTrack || mediaTrack === this.#localScreenShareTrack) {
			return;
		}
		this.#clearLocalScreenShareEndedListener();
		const ended = () => {
			if (this.#localScreenShareTrack !== mediaTrack) {
				return;
			}
			void this.#disableScreenshareAfterCaptureEnded();
		};
		this.#localScreenShareTrack = mediaTrack;
		this.#localScreenShareEnded = ended;
		mediaTrack.addEventListener("ended", ended);
	}

	#clearLocalScreenShareEndedListener(): void {
		if (this.#localScreenShareTrack && this.#localScreenShareEnded) {
			this.#localScreenShareTrack.removeEventListener(
				"ended",
				this.#localScreenShareEnded,
			);
		}
		this.#localScreenShareTrack = undefined;
		this.#localScreenShareEnded = undefined;
	}

	async #disableScreenshareAfterCaptureEnded(): Promise<void> {
		const room = this.#room;
		if (
			!room ||
			!room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
		) {
			return;
		}
		try {
			await room.localParticipant.setScreenShareEnabled(false);
		} catch {
			const publication = room.localParticipant.getTrackPublication(
				Track.Source.ScreenShare,
			);
			if (publication?.track) {
				await room.localParticipant.unpublishTrack(publication.track, true);
			}
		}
		this.#emitFromRoom();
	}

	#screenShareErrorMessage(error: unknown): string {
		if (
			error instanceof Error &&
			(error.name === "NotAllowedError" || error.name === "NotFoundError")
		) {
			return "Screen sharing was cancelled.";
		}
		return `Screen sharing failed: ${errorMessage(error)}`;
	}

	#syncVideoSnapshot(): VoiceVideoSnapshot {
		const room = this.#room;
		if (!room) {
			return IDLE_VOICE_VIDEO;
		}
		const surfaces: VoiceVideoSurfaceDescriptor[] = [];
		const local = room.localParticipant;
		const localCameraTrack = liveVideoTrack(
			local.getTrackPublication(Track.Source.Camera),
		);
		const localScreenTrack = liveVideoTrack(
			local.getTrackPublication(Track.Source.ScreenShare),
		);
		this.#appendVideoSurface(
			surfaces,
			local.sid,
			local.identity,
			local.name || local.identity,
			"camera",
			true,
			localCameraTrack,
		);
		this.#appendVideoSurface(
			surfaces,
			local.sid,
			local.identity,
			local.name || local.identity,
			"screenshare",
			true,
			localScreenTrack,
		);
		for (const participant of room.remoteParticipants.values()) {
			const publication = participant.getTrackPublication(
				Track.Source.ScreenShare,
			);
			if (!publication || publication.isMuted) {
				continue;
			}
			const watching = isWatchingScreenShare(
				this.#watchingLive,
				participant.sid,
			);
			this.#appendVideoSurface(
				surfaces,
				participant.sid,
				participant.identity,
				participant.name || participant.identity,
				"screenshare",
				false,
				watching ? liveVideoTrack(publication) : undefined,
				watching,
			);
		}
		const snapshot = deriveVoiceVideoSnapshot({
			surfaces,
			localCameraEnabled: Boolean(localCameraTrack),
			localScreenshareEnabled: Boolean(localScreenTrack),
		});
		this.#syncVideoTracks(snapshot);
		return snapshot;
	}

	#appendVideoSurface(
		surfaces: VoiceVideoSurfaceDescriptor[],
		participantSid: string,
		participantIdentity: string,
		participantName: string,
		source: VoiceVideoSource,
		local: boolean,
		track: VideoTrackLike | undefined,
		isWatching = local,
	): void {
		if (local && !track) {
			return;
		}
		const id = voiceVideoSurfaceId(participantSid, source);
		const previousTrack = this.#videoTracks.get(id);
		const generation = this.#videoGenerations.get(id) ?? 0;
		const nextGeneration =
			previousTrack === track ? generation : generation + 1;
		this.#videoTracks.set(id, track);
		this.#videoGenerations.set(id, nextGeneration);
		surfaces.push({
			id,
			participantSid,
			participantIdentity,
			participantName,
			source,
			local,
			isLive: Boolean(track),
			isWatching,
			mediaGeneration: nextGeneration,
		});
	}

	#syncVideoTracks(snapshot: VoiceVideoSnapshot): void {
		const activeIds = new Set(snapshot.surfaces.map((surface) => surface.id));
		for (const id of this.#videoTracks.keys()) {
			if (!activeIds.has(id)) {
				this.#videoTracks.delete(id);
				this.#videoGenerations.delete(id);
				const element = this.#videoElements.get(id);
				if (element) {
					this.#detachVideoTrack(id, element);
				}
			}
		}
		for (const surface of snapshot.surfaces) {
			const element = this.#videoElements.get(surface.id);
			if (element) {
				this.#attachVideoTrack(surface.id, element);
			}
		}
		this.#publishVideoSnapshot(snapshot);
	}

	#attachVideoTrack(id: string, element: HTMLVideoElement): void {
		const track = this.#videoTracks.get(id);
		const attached = this.#attachedVideoTracks.get(id);
		if (
			attached &&
			(attached.element !== element || attached.track !== track)
		) {
			this.#detachVideoTrack(id, attached.element);
		}
		if (!track || this.#attachedVideoTracks.has(id)) {
			return;
		}
		track.attach(element);
		this.#attachedVideoTracks.set(id, { element, track });
	}

	#detachVideoTrack(id: string, element: HTMLVideoElement): void {
		const attached = this.#attachedVideoTracks.get(id);
		if (!attached || attached.element !== element) {
			return;
		}
		attached.track.detach(element);
		this.#attachedVideoTracks.delete(id);
	}

	#clearVideoSurfaces(): void {
		for (const [id, attached] of this.#attachedVideoTracks) {
			attached.track.detach(attached.element);
			this.#attachedVideoTracks.delete(id);
		}
		this.#videoTracks.clear();
		this.#videoGenerations.clear();
		this.#videoElements.clear();
		this.#publishVideoSnapshot(IDLE_VOICE_VIDEO);
	}

	#publishVideoSnapshot(snapshot: VoiceVideoSnapshot): void {
		this.#videoSnapshot = snapshot;
		for (const listener of this.#videoListeners) {
			listener();
		}
	}

	#emitFromRoom(): void {
		const prefs = readVoicePrefs();
		const room = this.#room;
		const channel = this.#channel;
		if (!room || !channel) {
			this.#publish({
				...IDLE_VOICE_SESSION,
				microphone: prefs.micOn && !prefs.deafen,
				deafen: prefs.deafen,
				error: this.#snapshot.error,
			});
			return;
		}

		const speakers = new Set(
			room.activeSpeakers.map((participant) => participant.identity),
		);
		const participants: VoiceRoomParticipantSnapshot[] = [];

		participants.push({
			identity: room.localParticipant.identity,
			name: room.localParticipant.name || room.localParticipant.identity,
			isLocal: true,
			micMuted: !room.localParticipant.isMicrophoneEnabled,
			deafened: prefs.deafen || participantIsDeafened(room.localParticipant),
			speaking: speakers.has(room.localParticipant.identity),
		});

		for (const participant of room.remoteParticipants.values()) {
			const mic = participant.getTrackPublication(Track.Source.Microphone);
			participants.push({
				identity: participant.identity,
				name: participant.name || participant.identity,
				isLocal: false,
				micMuted: mic ? mic.isMuted || !mic.isSubscribed : true,
				deafened: participantIsDeafened(participant),
				speaking: speakers.has(participant.identity),
			});
		}

		const video = this.#syncVideoSnapshot();
		this.#publish({
			phase:
				room.state === ConnectionState.Connected
					? "connected"
					: room.state === ConnectionState.Reconnecting
						? "reconnecting"
						: room.state === ConnectionState.Connecting
							? "connecting"
							: this.#snapshot.phase,
			channelId: channel.id,
			channelName: channelDisplayName(channel),
			localIdentity: room.localParticipant.identity || null,
			error: null,
			microphone: prefs.micOn && !prefs.deafen,
			deafen: prefs.deafen,
			canSpeak: this.#canSpeak(channel),
			cameraEnabled: video.localCameraEnabled,
			screenshareEnabled: video.localScreenshareEnabled,
			hasVideoStage: video.surfaces.length > 0,
			participants,
		});
		this.#applyRemoteAudioMuteState();
	}

	#publish(next: VoiceSessionSnapshot): void {
		this.#snapshot = next;
		for (const listener of this.#listeners) {
			listener();
		}
	}

	async #acquireWakeLock(): Promise<void> {
		try {
			const nav = navigator as Navigator & {
				wakeLock?: {
					request: (type: "screen") => Promise<WakeLockSentinelLike>;
				};
			};
			if (!nav.wakeLock) {
				return;
			}
			this.#wakeLock = await nav.wakeLock.request("screen");
		} catch {
			this.#wakeLock = null;
		}
	}

	async #releaseWakeLock(): Promise<void> {
		const lock = this.#wakeLock;
		this.#wakeLock = null;
		if (!lock) {
			return;
		}
		try {
			await lock.release();
		} catch {
			/* ignore */
		}
	}
}

export const voiceRuntime = new VoiceRuntime();
