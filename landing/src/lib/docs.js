/** Short doc URLs that render content from another route. */
/** @type {Record<string, string>} */
export const DOC_HREF_ALIASES = {
	'/docs/quick-setup': '/docs/project/user-guide/02-quick-start'
};

/** @param {string} href */
export function resolveDocHref(href) {
	return DOC_HREF_ALIASES[href] ?? href;
}

/** @param {string} a @param {string} b */
export function sameDocPage(a, b) {
	return a === b || resolveDocHref(a) === b || resolveDocHref(b) === a;
}

/** @param {string} route */
export function isTxtRoute(route) {
	const slug = route.split('/').pop() ?? route;
	return /^rfc\d+$/i.test(slug) || slug.startsWith('draft-');
}

/** @param {string} route */
export function sourcePathForRoute(route) {
	const ext = isTxtRoute(route) ? '.txt' : '.md';
	return `content/docs/${route}${ext}`;
}

/** @param {string} route */
export function hrefFromRoute(route) {
	if (route === 'project/user-guide/README') return '/docs';
	return `/docs/${route}`;
}

/** @param {string} href */
export function routeFromHref(href) {
	const resolved = resolveDocHref(href);
	if (resolved === '/docs') return 'project/user-guide/README';
	return resolved.replace(/^\/docs\//, '');
}

/** @param {string} slug */
export function labelFromSlug(slug) {
	const rfcMatch = slug.match(/^rfc(\d+)$/i);
	if (rfcMatch) return `RFC ${rfcMatch[1]}`;

	if (slug.startsWith('draft-')) {
		return slug
			.slice('draft-'.length)
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	return slug
		.replace(/^\d+-/, '')
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** @param {string} route */
export function labelFromRoute(route) {
	if (route === 'project/user-guide/README') return 'Documentation';
	return labelFromSlug(route.split('/').pop() ?? route);
}
