import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSessionLifecycle } from "@/hooks/useSessionLifecycle";
import { useVoicePrefsBridge } from "@/hooks/useVoiceSession";
import { PREFS_KEY } from "@/state/prefs";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

function SessionLifecycle({ children }: { children: ReactNode }) {
	useSessionLifecycle();
	useVoicePrefsBridge();
	return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			storageKey={PREFS_KEY.theme}
		>
			<QueryClientProvider client={queryClient}>
				<SessionLifecycle>
					<TooltipProvider>
						{children}
						<Toaster />
					</TooltipProvider>
				</SessionLifecycle>
			</QueryClientProvider>
		</ThemeProvider>
	);
}
