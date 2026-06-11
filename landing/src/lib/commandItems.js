import { closeCommandPalette } from '$lib/commandPalette.svelte.js';
import { theme, toggleLightMode } from '$lib/theme.svelte.js';

/** @typedef {{ id: string, label: string, group: string, keywords: string, hint?: string, getLabel?: () => string, run: () => void }} PaletteCommand */

/** @returns {PaletteCommand[]} */
export function getPaletteCommands() {
	return [
		{
			id: 'toggle-theme',
			label: 'Toggle light mode',
			getLabel: () => (theme.light ? 'Switch to dark mode' : 'Switch to light mode'),
			group: 'Command',
			keywords:
				'toggle light dark mode theme brightness color appearance switch enable disable',
			hint: 'Change site color theme',
			run: () => {
				toggleLightMode();
				closeCommandPalette();
			}
		}
	];
}
