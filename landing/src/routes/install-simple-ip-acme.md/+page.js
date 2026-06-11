import { redirect } from '@sveltejs/kit';
import { mdRedirectTarget } from '$lib/mdRedirects.js';

export function load() {
	redirect(301, mdRedirectTarget('install-simple-ip-acme.md') ?? '/docs/install-simple-ip-acme');
}
