import { error, redirect } from '@sveltejs/kit';
import { MD_REDIRECTS, mdRedirectTarget } from '$lib/mdRedirects.js';

export const prerender = true;

export function entries() {
	return Object.keys(MD_REDIRECTS)
		.filter((file) => file.endsWith('.md') && file !== 'README.md')
		.map((file) => ({ file }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const target = mdRedirectTarget(params.file);
	if (target) redirect(301, target);
	error(404, 'Not found');
}
