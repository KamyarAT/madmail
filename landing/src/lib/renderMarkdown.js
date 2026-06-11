import { marked } from 'marked';
import { resolveHref } from './docLinks.js';
import { sourcePathForRoute } from './docs.js';
import { wrapTableOfContentsHtml } from './enhanceDocHtml.js';
import { uniqueSlug } from './slugify.js';

/** @param {string} markdown @param {string} route */
export function renderMarkdown(markdown, route) {
	const sourcePath = sourcePathForRoute(route);
	const usedSlugs = new Set();

	marked.use({
		renderer: {
			heading({ text, depth }) {
				const id = uniqueSlug(text, usedSlugs);
				return `<h${depth} id="${id}">${text}</h${depth}>\n`;
			},
			link({ href, title, text }) {
				if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
					const titleAttr = title ? ` title="${title}"` : '';
					return `<a href="${href}"${titleAttr}>${text}</a>`;
				}

				const resolved = resolveHref(href, sourcePath) ?? href;
				const titleAttr = title ? ` title="${title}"` : '';
				return `<a href="${resolved}"${titleAttr}>${text}</a>`;
			}
		}
	});

	return wrapTableOfContentsHtml(marked.parse(markdown, { async: false }));
}
