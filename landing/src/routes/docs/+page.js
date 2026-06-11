import { error } from '@sveltejs/kit';
import { loadDocModule } from '$lib/docModules.js';
import { docMetaForRoute } from '$lib/docPageMeta.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const mod = await loadDocModule('project/user-guide/README');

	if (!mod) {
		error(404, 'Documentation index not found');
	}

	const meta = await docMetaForRoute('project/user-guide/README');

	return {
		href: '/docs',
		title: meta.title,
		description: meta.description,
		Content: mod.default
	};
}
