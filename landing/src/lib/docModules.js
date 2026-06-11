/** @type {Record<string, () => Promise<{ default: import('svelte').Component }>>} */
export const docLoaders = import.meta.glob([
	'/src/lib/content/docs/project/user-guide/*.md',
	'/src/lib/content/docs/install-simple-ip-acme.md'
]);

/** @param {string} key */
export function routeFromLoaderKey(key) {
	return key
		.replace(/^\/src\/lib\/content\/docs\//, '')
		.replace(/\.md$/, '');
}

/** @param {string} route */
export async function loadDocModule(route) {
	const suffix = `/${route}.md`;
	const entry = Object.entries(docLoaders).find(([key]) => key.endsWith(suffix));

	if (!entry) {
		return null;
	}

	return entry[1]();
}
