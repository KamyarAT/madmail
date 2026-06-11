/** Short aliases and .md filenames mapped to canonical doc routes. */
/** @type {Record<string, string>} */
export const MD_REDIRECTS = {
	'01-what-is-chatmail.md': '/docs/project/user-guide/01-what-is-chatmail',
	'02-quick-start.md': '/docs/project/user-guide/02-quick-start',
	'11-deployment-ip-domain-certs.md': '/docs/project/user-guide/11-deployment-ip-domain-certs',
	'install-simple-ip-acme.md': '/docs/install-simple-ip-acme',
	'README.md': '/docs',
	features: '/docs/project/user-guide/01-what-is-chatmail',
	'quick-setup': '/docs/quick-setup',
	deployment: '/docs/project/user-guide/11-deployment-ip-domain-certs',
	'install-simple-ip-acme': '/docs/install-simple-ip-acme'
};

/** @param {string} filename */
export function mdRedirectTarget(filename) {
	if (MD_REDIRECTS[filename]) return MD_REDIRECTS[filename];

	const base = filename.split('/').pop() ?? filename;
	if (MD_REDIRECTS[base]) return MD_REDIRECTS[base];

	if (/^\d{2}-.+\.md$/i.test(base)) {
		return `/docs/project/user-guide/${base.replace(/\.md$/i, '')}`;
	}

	if (filename.endsWith('.md')) {
		return `/docs/${filename.replace(/\.md$/i, '')}`;
	}

	if (base.endsWith('.md')) {
		return `/docs/${base.replace(/\.md$/i, '')}`;
	}

	return null;
}
