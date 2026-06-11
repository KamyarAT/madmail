const TOC_HEADING = /<h2([^>]*)>Table of contents<\/h2>/i;

/** @param {string} html */
export function wrapTableOfContentsHtml(html) {
	const match = html.match(TOC_HEADING);
	if (!match || match.index == null) return html;

	const afterHeading = match.index + match[0].length;
	const ulStart = html.indexOf('<ul', afterHeading);
	if (ulStart === -1) return html;

	let depth = 0;
	let index = ulStart;

	while (index < html.length) {
		const nextOpen = html.indexOf('<ul', index);
		const nextClose = html.indexOf('</ul>', index);
		if (nextClose === -1) break;

		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth += 1;
			index = nextOpen + 3;
			continue;
		}

		depth -= 1;
		index = nextClose + 5;

		if (depth === 0) {
			const listHtml = html
				.slice(ulStart, index)
				.replace(/^<ul\b/, '<ul class="doc-toc__list"');
			const before = html.slice(0, match.index);
			const after = html.slice(index);
			return `${before}<details class="doc-toc" open><summary class="doc-toc__summary">Table of contents</summary>${listHtml}</details>${after}`;
		}
	}

	return html;
}
