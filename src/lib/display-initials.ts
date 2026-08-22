/**
 * Word-aware initials for avatar fallbacks.
 * Two+ words → first letter of first two. Else first two characters.
 */
export function displayInitials(name: string): string {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter((part) => part.length > 0);
	const first = parts[0];
	const second = parts[1];
	if (first && second) {
		return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}
