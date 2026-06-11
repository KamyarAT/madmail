import { visit } from 'unist-util-visit';

const TOC_TITLE = 'table of contents';

/** @param {import('hast').Nodes} node */
function elementText(node) {
	if (node.type === 'text') return node.value;
	if ('children' in node && Array.isArray(node.children)) {
		return node.children.map(elementText).join('');
	}
	return '';
}

/** @returns {import('unified').Plugin} */
export function rehypeDocToc() {
	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (!parent || index == null || node.tagName !== 'h2') return;
			if (elementText(node).trim().toLowerCase() !== TOC_TITLE) return;

			const next = parent.children[index + 1];
			if (!next || next.type !== 'element' || next.tagName !== 'ul') return;

			parent.children[index] = {
				type: 'element',
				tagName: 'details',
				properties: { className: ['doc-toc'], open: true },
				children: [
					{
						type: 'element',
						tagName: 'summary',
						properties: { className: ['doc-toc__summary'] },
						children: [{ type: 'text', value: 'Table of contents' }]
					},
					{
						...next,
						properties: {
							...next.properties,
							className: [...(next.properties?.className ?? []), 'doc-toc__list']
						}
					}
				]
			};
			parent.children.splice(index + 1, 1);
		});
	};
}
