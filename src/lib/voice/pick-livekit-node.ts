export type LivekitNode = {
	name: string;
	public_url: string;
};

export function livekitHttpProbeUrl(publicUrl: string): string {
	return publicUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
}

/**
 * Race HTTP probes against LiveKit nodes. First healthy node name wins.
 * Mirrors the Solid client's Promise.any over config.features.livekit.nodes.
 */
export async function pickLivekitNode(
	nodes: readonly LivekitNode[],
	fetchImpl: typeof fetch = fetch,
): Promise<string> {
	if (nodes.length === 0) {
		throw new Error("No LiveKit nodes configured");
	}

	return Promise.any(
		nodes.map(async (node) => {
			const response = await fetchImpl(livekitHttpProbeUrl(node.public_url));
			if (!response.ok && response.status !== 404) {
				throw new Error(`LiveKit probe failed for ${node.name}`);
			}
			return node.name;
		}),
	);
}
