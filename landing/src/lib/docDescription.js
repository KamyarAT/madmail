const META_DESCRIPTION_MAX = 160;

/** @param {string} text */
function truncateDescription(text) {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length <= META_DESCRIPTION_MAX) return normalized;

	const cut = normalized.slice(0, META_DESCRIPTION_MAX - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** @param {string} text */
export function cleanMarkdownInline(text) {
	return text
		.replace(/!\[[^\]]*]\([^)]+\)/g, '')
		.replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/__([^_]+)__/g, '$1')
		.replace(/_([^_]+)_/g, '$1')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** @param {string} markdown */
export function descriptionFromMarkdown(markdown) {
	let source = markdown.replace(/^\uFEFF?---[\s\S]*?---\n?/, '');
	const lines = source.split('\n');
	let index = 0;

	while (index < lines.length && !/^#\s+/.test(lines[index])) index++;
	if (index < lines.length) index++;

	while (
		index < lines.length &&
		(/^\s*$/.test(lines[index]) ||
			/^#+\s/.test(lines[index]) ||
			/^>\s/.test(lines[index]) ||
			/^[-|]/.test(lines[index].trim()))
	) {
		index++;
	}

	/** @type {string[]} */
	const paragraph = [];

	while (
		index < lines.length &&
		lines[index].trim() !== '' &&
		!/^#+\s/.test(lines[index]) &&
		!/^```/.test(lines[index])
	) {
		paragraph.push(lines[index]);
		index++;
	}

	const text = cleanMarkdownInline(paragraph.join(' '));
	return text ? truncateDescription(text) : '';
}

/** @param {string} text @param {string} title */
export function descriptionFromPlainText(text, title) {
	const line =
		text
			.split('\n')
			.map((row) => row.trim())
			.find((row) => row && !/^RFC/i.test(row) && !/^\d/.test(row)) ?? '';

	const cleaned = cleanMarkdownInline(line);
	if (cleaned) return truncateDescription(cleaned);

	return truncateDescription(`${title} — Madmail documentation reference.`);
}
