/** @param {string} text */
function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** @param {string} text @param {string} route */
export function renderPlainText(text, route) {
	void route;
	return `<div class="rfc-text">${escapeHtml(text)}</div>`;
}
