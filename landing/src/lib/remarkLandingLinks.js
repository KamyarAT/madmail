import { visit } from 'unist-util-visit';
import { resolveHref } from './docLinks.js';

/** @returns {import('unified').Plugin} */
export function remarkLandingLinks() {
	return (tree, file) => {
		const sourcePath = file?.path ?? file?.history?.[0] ?? '';

		visit(tree, 'link', (node) => {
			let url = node.url;
			if (!url || url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('#')) {
				return;
			}

			if (/^\/\d{2}-/.test(url)) {
				url = `/docs/project/user-guide${url}`;
			}

			const resolved = resolveHref(url, sourcePath);
			if (resolved) {
				node.url = resolved;
			}
		});
	};
}
