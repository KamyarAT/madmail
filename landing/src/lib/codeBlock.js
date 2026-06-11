import copyIcon from './icons/document-duplicate.svg?raw';

export const CHECK_ICON =
	'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 12.75l6 6 9-13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export const UNDO_ICON =
	'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** @param {HTMLElement} wrap */
export function flashCodeBlock(wrap) {
	wrap.classList.remove('code-block--copied');
	void wrap.offsetWidth;
	wrap.classList.add('code-block--copied');
	window.setTimeout(() => wrap.classList.remove('code-block--copied'), 700);
}

/** @param {HTMLElement} pre */
function readPreText(pre) {
	const code = pre.querySelector('code');
	const raw = code ? (code.innerText || code.textContent) : pre.textContent;
	return (raw ?? '').replace(/\n$/, '');
}

/** @param {HTMLElement} pre @param {string} text */
function writePreText(pre, text) {
	let code = pre.querySelector('code');
	if (!code) {
		code = document.createElement('code');
		pre.append(code);
	}
	code.textContent = text;
}

/** @param {HTMLTextAreaElement} textarea @param {HTMLElement} pre */
function syncTextareaStyles(textarea, pre) {
	const code = pre.querySelector('code') ?? pre;
	const preStyle = getComputedStyle(pre);
	const codeStyle = getComputedStyle(code);

	textarea.style.font = codeStyle.font;
	textarea.style.letterSpacing = codeStyle.letterSpacing;
	textarea.style.lineHeight = codeStyle.lineHeight;
	textarea.style.tabSize = codeStyle.tabSize;
	textarea.style.padding = preStyle.padding;
	textarea.style.color = codeStyle.color;
}

/** @param {HTMLElement} wrap @param {HTMLElement} pre */
export function initCopyOnlyCodeBlock(wrap, pre) {
	if (wrap.dataset.copyCode === 'true') return;
	wrap.dataset.copyCode = 'true';

	const copyBtn = document.createElement('button');
	copyBtn.type = 'button';
	copyBtn.className = 'code-action code-copy';
	copyBtn.setAttribute('aria-label', 'Copy code');
	copyBtn.innerHTML = copyIcon;
	copyBtn.addEventListener('click', async () => {
		const text = readPreText(pre).replace(/\n$/, '');
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			return;
		}

		flashCodeBlock(wrap);
		copyBtn.innerHTML = CHECK_ICON;
		copyBtn.dataset.copied = '';
		window.setTimeout(() => {
			delete copyBtn.dataset.copied;
			copyBtn.innerHTML = copyIcon;
		}, 1500);
	});

	const toolbar = document.createElement('div');
	toolbar.className = 'code-toolbar';
	toolbar.append(copyBtn);
	wrap.append(toolbar);
}

/** @param {HTMLElement} pre */
export function isShellCodeBlock(pre) {
	const classes = [
		...(pre.classList ?? []),
		...(pre.querySelector('code')?.classList ?? [])
	];

	return classes.some((cls) => /^language-(bash|sh|shell|zsh)$/.test(cls));
}

/** @param {HTMLElement} wrap @param {HTMLElement} pre */
export function initEditableCodeBlock(wrap, pre) {
	if (wrap.dataset.editableCode === 'true') return;
	wrap.dataset.editableCode = 'true';

	const original = readPreText(pre);
	let draft = original;

	// Flatten syntax-highlight markup once so view and edit modes match.
	writePreText(pre, original);

	/** @type {HTMLTextAreaElement | null} */
	let textarea = null;
	/** @type {HTMLButtonElement | null} */
	let undoBtn = null;
	/** @type {HTMLButtonElement | null} */
	let copyBtn = null;

	function updateUndo() {
		if (undoBtn) undoBtn.disabled = draft === original;
	}

	function startEdit() {
		wrap.classList.add('code-block--editing');

		if (!textarea) {
			textarea = document.createElement('textarea');
			textarea.spellcheck = false;
			textarea.setAttribute('aria-label', 'Edit code');
			textarea.addEventListener('input', () => {
				draft = textarea.value;
				updateUndo();
			});
			textarea.addEventListener('blur', finishEdit);
			syncTextareaStyles(textarea, pre);
			wrap.append(textarea);
		}

		textarea.value = draft;
		syncTextareaStyles(textarea, pre);
		queueMicrotask(() => textarea?.focus());
		updateUndo();
	}

	function finishEdit() {
		wrap.classList.remove('code-block--editing');
		writePreText(pre, draft);
	}

	function undo() {
		draft = original;
		writePreText(pre, draft);
		if (textarea) textarea.value = draft;
		updateUndo();
		queueMicrotask(() => textarea?.focus());
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(draft.replace(/\n$/, ''));
		} catch {
			return;
		}

		flashCodeBlock(wrap);
		if (copyBtn) {
			copyBtn.innerHTML = CHECK_ICON;
			copyBtn.dataset.copied = '';
			window.setTimeout(() => {
				if (!copyBtn) return;
				delete copyBtn.dataset.copied;
				copyBtn.innerHTML = copyIcon;
			}, 1500);
		}
	}

	pre.addEventListener('click', startEdit);

	const toolbar = document.createElement('div');
	toolbar.className = 'code-toolbar';
	toolbar.addEventListener('mousedown', (event) => event.preventDefault());

	copyBtn = document.createElement('button');
	copyBtn.type = 'button';
	copyBtn.className = 'code-action code-copy';
	copyBtn.setAttribute('aria-label', 'Copy code');
	copyBtn.innerHTML = copyIcon;
	copyBtn.addEventListener('click', copy);
	toolbar.append(copyBtn);
	wrap.append(toolbar);

	const undoBar = document.createElement('div');
	undoBar.className = 'code-undo-bar';
	undoBar.addEventListener('mousedown', (event) => event.preventDefault());

	undoBtn = document.createElement('button');
	undoBtn.type = 'button';
	undoBtn.className = 'code-action code-undo';
	undoBtn.setAttribute('aria-label', 'Undo changes');
	undoBtn.innerHTML = UNDO_ICON;
	undoBtn.disabled = true;
	undoBtn.addEventListener('click', undo);
	undoBar.append(undoBtn);
	wrap.append(undoBar);
}
