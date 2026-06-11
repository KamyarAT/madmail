import documentation from '$lib/assets/documentation.json';

/** @typedef {{ id: string, type: 'dir', label: string, children: DocTreeNode[] }} DocTreeDir */
/** @typedef {{ id: string, type: 'file', label: string, route: string, href: string, external: boolean }} DocTreeFile */
/** @typedef {DocTreeDir | DocTreeFile} DocTreeNode */

/** Tree sections hidden from the documentation tree modal only. */
const HIDDEN_TREE_DIR_IDS = new Set(['man']);

/** @param {DocTreeNode[]} nodes */
function filterTreeNodes(nodes) {
	return nodes.flatMap((node) => {
		if (node.type === 'dir') {
			if (HIDDEN_TREE_DIR_IDS.has(node.id)) return [];
			return [{ ...node, children: filterTreeNodes(node.children) }];
		}
		return [node];
	});
}

/** @type {DocTreeNode[]} */
export const docTreeNodes = filterTreeNodes(documentation.tree);

/** @param {DocTreeNode[]} nodes @param {string} href @param {string[]} ancestors */
export function ancestorIdsForHref(nodes, href, ancestors = []) {
	for (const node of nodes) {
		if (node.type === 'file' && node.href === href) {
			return ancestors;
		}

		if (node.type === 'dir' && node.children?.length) {
			const found = ancestorIdsForHref(node.children, href, [...ancestors, node.id]);
			if (found) return found;
		}
	}

	return null;
}

/** @param {DocTreeNode[]} nodes @param {string} dirId @param {string[]} ancestors */
export function ancestorIdsForDirId(nodes, dirId, ancestors = []) {
	for (const node of nodes) {
		if (node.type === 'dir' && node.id === dirId) {
			return ancestors;
		}

		if (node.type === 'dir' && node.children?.length) {
			const found = ancestorIdsForDirId(node.children, dirId, [...ancestors, node.id]);
			if (found) return found;
		}
	}

	return null;
}

/** @typedef {{ id: string, label: string, readmeHref: string | null }} DocTreeBreadcrumb */
/** @typedef {{ kind: 'dir' | 'file', label: string, href: string }} DocDirListingEntry */

/** @param {DocTreeDir} dir */
export function readmeHrefForDir(dir) {
	const readme = dir.children?.find(
		(child) =>
			child.type === 'file' &&
			(child.route.endsWith('/README') || child.id.endsWith('/README'))
	);
	return readme?.type === 'file' ? readme.href : null;
}

/** @param {string} dirId */
export function hrefForDirId(dirId) {
	return `/docs/${dirId}`;
}

/** @param {DocTreeNode[]} nodes @param {string} id */
export function findDirById(nodes, id) {
	for (const node of nodes) {
		if (node.type === 'dir' && node.id === id) return node;
		if (node.type === 'dir' && node.children?.length) {
			const found = findDirById(node.children, id);
			if (found) return found;
		}
	}
	return null;
}

/** @param {DocTreeNode[]} nodes @param {string} href */
export function findFileByHref(nodes, href) {
	for (const node of nodes) {
		if (node.type === 'file' && node.href === href) return node;
		if (node.type === 'dir' && node.children?.length) {
			const found = findFileByHref(node.children, href);
			if (found) return found;
		}
	}
	return null;
}

/** @param {string} href */
export function isDirListingHref(href) {
	if (href === '/docs') return false;
	const route = href.replace(/^\/docs\//, '');
	const dir = findDirById(docTreeNodes, route);
	return dir != null && findFileByHref(docTreeNodes, href) == null;
}

/** @param {DocTreeDir} dir */
export function listingEntriesForDir(dir) {
	/** @type {DocDirListingEntry[]} */
	const entries = [];

	for (const child of dir.children ?? []) {
		if (child.type === 'dir') {
			entries.push({
				kind: 'dir',
				label: child.label,
				href: hrefForDirId(child.id)
			});
			continue;
		}

		const isReadme = child.route.endsWith('/README') || child.id.endsWith('/README');
		entries.push({
			kind: 'file',
			label: isReadme ? 'Overview' : child.label,
			href: child.href
		});
	}

	return entries;
}

/** @param {DocTreeNode[]} nodes @param {string} dirId @param {DocTreeBreadcrumb[]} trail */
export function ancestorTrailForDirId(nodes, dirId, trail = []) {
	for (const node of nodes) {
		if (node.type === 'dir' && node.id === dirId) {
			return trail;
		}

		if (node.type === 'dir' && node.children?.length) {
			const found = ancestorTrailForDirId(node.children, dirId, [
				...trail,
				{ id: node.id, label: node.label, readmeHref: readmeHrefForDir(node) }
			]);
			if (found) return found;
		}
	}

	return null;
}

/** @param {DocTreeNode[]} nodes @param {string[]} ids */
function collectDirIds(nodes, ids = []) {
	for (const node of nodes) {
		if (node.type === 'dir') {
			ids.push(node.id);
			collectDirIds(node.children, ids);
		}
	}
	return ids;
}

/** @returns {string[]} */
export function getAllDirRoutes() {
	return collectDirIds(docTreeNodes);
}

/** @param {DocTreeNode[]} nodes @param {string} href @param {DocTreeBreadcrumb[]} trail */
export function ancestorTrailForHref(nodes, href, trail = []) {
	for (const node of nodes) {
		if (node.type === 'file' && node.href === href) {
			return trail;
		}

		if (node.type === 'dir' && node.children?.length) {
			const found = ancestorTrailForHref(node.children, href, [
				...trail,
				{ id: node.id, label: node.label, readmeHref: readmeHrefForDir(node) }
			]);
			if (found) return found;
		}
	}

	return null;
}
