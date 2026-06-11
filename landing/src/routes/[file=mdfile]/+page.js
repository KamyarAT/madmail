import { error, redirect } from '@sveltejs/kit';
import { MD_REDIRECTS, mdRedirectTarget } from '$lib/mdRedirects.js';
import { PUBLISHED_DOC_ROUTES } from '$lib/publishedDocs.js';

export const prerender = true;

export function entries() {
	const fromMap = Object.keys(MD_REDIRECTS).filter((file) => file.endsWith('.md') && file !== 'README.md');
	const fromGuides = PUBLISHED_DOC_ROUTES.filter((route) => route.startsWith('project/user-guide/')).map(
		(route) => `${route.split('/').pop()}.md`
	);

	return [...new Set([...fromMap, ...fromGuides])].map((file) => ({ file }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const target = mdRedirectTarget(params.file);
	if (target) redirect(301, target);
	error(404, 'Not found');
}
