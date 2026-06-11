import { browser } from '$app/environment';

const STORAGE_KEY = 'madmail-light';

/** @returns {boolean} */
function readStoredLight() {
	if (!browser) return false;
	try {
		return localStorage.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/** @param {boolean} light */
function persistLight(light) {
	if (!browser) return;
	try {
		if (light) localStorage.setItem(STORAGE_KEY, 'true');
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore storage errors
	}
}

export const theme = $state({ light: readStoredLight() });

export function toggleLightMode() {
	theme.light = !theme.light;
	persistLight(theme.light);
}
