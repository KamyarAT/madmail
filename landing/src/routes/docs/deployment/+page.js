import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(301, '/docs/project/user-guide/11-deployment-ip-domain-certs');
}
