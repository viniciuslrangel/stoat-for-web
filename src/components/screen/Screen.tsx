import type { ScreenId } from "@/domain/screens";

export function Screen({ id, title }: { id: ScreenId; title: string }) {
	return (
		<main
			className="flex min-h-svh flex-col gap-2 p-8"
			data-testid={`screen-${id}`}
		>
			<h1 className="text-2xl font-semibold">{title}</h1>
		</main>
	);
}
