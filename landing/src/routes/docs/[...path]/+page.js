import { error } from '@sveltejs/kit';
import { loadDocModule } from '$lib/docModules.js';
import {
	docTreeNodes,
	findDirById,
	getAllDirRoutes,
	hrefForDirId,
	listingEntriesForDir
} from '$lib/docTreeData.js';
import { hrefFromRoute, isTxtRoute } from '$lib/docs.js';
import { docMetaForRoute, dirMetaForDir } from '$lib/docPageMeta.js';
import { getAllDocRoutes, loadRawDoc } from '$lib/rawDocModules.js';
import { renderMarkdown } from '$lib/renderMarkdown.js';
import { renderPlainText } from '$lib/renderPlainText.js';

export const prerender = true;

export function entries() {
	const docRoutes = new Set(getAllDocRoutes());
	const dirRoutes = getAllDirRoutes().filter((path) => !docRoutes.has(path));
	return [
		...docRoutes.values(),
		...dirRoutes
	].map((path) => ({ path }));
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const route = params.path;
	const compiled = await loadDocModule(route);

	if (compiled) {
		const meta = await docMetaForRoute(route);
		return {
			kind: 'doc',
			href: hrefFromRoute(route),
			title: meta.title,
			description: meta.description,
			Content: compiled.default,
			html: null
		};
	}

	const markdown = await loadRawDoc(route);
	if (!markdown) {
		const dir = findDirById(docTreeNodes, route);
		if (dir) {
			const meta = await dirMetaForDir(dir);
			return {
				kind: 'dir',
				href: hrefForDirId(route),
				title: meta.title,
				description: meta.description,
				entries: listingEntriesForDir(dir)
			};
		}

		error(404, 'Documentation page not found');
	}

	const meta = await docMetaForRoute(route);

	return {
		kind: 'doc',
		href: hrefFromRoute(route),
		title: meta.title,
		description: meta.description,
		Content: null,
		html: isTxtRoute(route) ? renderPlainText(markdown, route) : renderMarkdown(markdown, route)
	};
}
