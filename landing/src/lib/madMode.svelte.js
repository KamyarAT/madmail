export const madMode = $state({ active: false });

export function activateMadMode() {
	madMode.active = true;
}
