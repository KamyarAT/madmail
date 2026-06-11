const GLITCH_CHARS = '0126789@#$%&*_\\|/<>[]{}!?~';

/** @param {string} source @param {number} intensity */
export function glitchScramble(source, intensity) {
	return source
		.split('')
		.map((ch) =>
			ch === ' ' ? ' ' : Math.random() < intensity ? pickGlitchChar() : ch
		)
		.join('');
}

function pickGlitchChar() {
	return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
}

/**
 * @param {string} target
 * @param {(letters: string[]) => void} onFrame
 * @param {() => void} [onDone]
 */
export function runMatrixResolve(target, onFrame, onDone) {
	const letters = [...target];
	const totalFrames = 28;
	let frame = 0;

	const id = window.setInterval(() => {
		frame++;
		const progress = frame / totalFrames;
		const intensity = Math.max(0, 1 - progress * 1.15);

		const next = letters.map((ch, i) => {
			const resolveAt = i / letters.length;
			if (progress > resolveAt + 0.35) return ch;
			if (Math.random() < intensity) return pickGlitchChar();
			return ch;
		});

		onFrame(next);

		if (frame >= totalFrames) {
			window.clearInterval(id);
			onFrame(letters);
			onDone?.();
		}
	}, 45);

	return () => {
		window.clearInterval(id);
		onFrame(letters);
		onDone?.();
	};
}
