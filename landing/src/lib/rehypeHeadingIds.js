import { visit } from 'unist-util-visit';
import GithubSlugger from './githubSlugger/index.js';

/** @param {import('hast').Nodes} node */
function elementText(node) {
	if (node.type === 'text') return node.value;
	if ('children' in node && Array.isArray(node.children)) {
		return node.children.map(elementText).join('');
	}
	return '';
}

/** @returns {import('unified').Plugin} */
export function rehypeHeadingIds() {
	return (tree) => {
		const slugger = new GithubSlugger();

		visit(tree, 'element', (node) => {
			if (!/^h[1-6]$/.test(node.tagName)) return;
			if (node.properties?.id) return;

			node.properties = {
				...node.properties,
				id: slugger.slug(elementText(node))
			};
		});
	};
}
