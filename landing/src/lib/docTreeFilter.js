/** @typedef {import('./docTreeData.js').DocTreeNode} DocTreeNode */

/** @typedef {'all' | 'user-guide' | 'reference'} DocTreeFilter */

/** @param {DocTreeNode} node @param {string} query */
function nodeMatchesQuery(node, query) {
	const haystack = `${node.label} ${node.type === 'file' ? node.route : node.id}`.toLowerCase();
	return haystack.includes(query);
}

/** @param {DocTreeNode} node @param {DocTreeFilter} filter */
function fileMatchesFilter(node, filter) {
	if (filter === 'user-guide') return node.route.startsWith('project/user-guide/');
	if (filter === 'reference') return !node.route.startsWith('project/user-guide/');
	return true;
}

/**
 * @param {DocTreeNode[]} nodes
 * @param {string} rawQuery
 * @param {DocTreeFilter} filter
 */
export function filterDocTree(nodes, rawQuery, filter) {
	const query = rawQuery.trim().toLowerCase();
	const hasQuery = query.length > 0;
	const hasFilter = filter !== 'all';

	if (!hasQuery && !hasFilter) return nodes;

	/** @param {DocTreeNode[]} branch */
	function walk(branch) {
		/** @type {DocTreeNode[]} */
		const result = [];

		for (const node of branch) {
			if (node.type === 'file') {
				if (!fileMatchesFilter(node, filter)) continue;
				if (hasQuery && !nodeMatchesQuery(node, query)) continue;
				result.push(node);
				continue;
			}

			const children = walk(node.children);
			const dirMatches = hasQuery && nodeMatchesQuery(node, query);

			if (children.length || (dirMatches && !hasFilter)) {
				result.push({ ...node, children });
			}
		}

		return result;
	}

	return walk(nodes);
}

/** @param {DocTreeNode[]} nodes @param {Set<string>} ids */
export function collectDirIds(nodes, ids) {
	for (const node of nodes) {
		if (node.type === 'dir') {
			ids.add(node.id);
			collectDirIds(node.children, ids);
		}
	}
}
