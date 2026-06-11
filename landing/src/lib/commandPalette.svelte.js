export const commandPalette = $state({ open: false });

export function openCommandPalette() {
	commandPalette.open = true;
}

export function closeCommandPalette() {
	commandPalette.open = false;
}

export function toggleCommandPalette() {
	commandPalette.open = !commandPalette.open;
}
