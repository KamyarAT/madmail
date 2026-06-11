import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(301, '/docs/project/user-guide/01-what-is-chatmail');
}
