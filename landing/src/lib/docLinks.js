import { hrefFromRoute } from './docs.js';

const REPO_BLOB = 'https://github.com/themadorg/madmail/blob/main';
const REPO_ROOT_PREFIXES = new Set(['context', 'crates', 'tests', 'scripts']);

/** @param {string} sourcePath */
function docsRootFromSource(sourcePath) {
	const match = sourcePath.replace(/\\/g, '/').match(/(.*\/docs)\//);
	return match?.[1] ?? null;
}

/** @param {string} sourcePath */
function sourceDocDir(sourcePath) {
	const normalized = sourcePath.replace(/\\/g, '/');
	const match = normalized.match(/docs\/(.+)\/[^/]+$/);
	return match?.[1] ?? '';
}

/** @param {string[]} baseParts @param {string} linkPath */
function resolveRelativeParts(baseParts, linkPath) {
	/** @type {string[]} */
	const stack = [...baseParts];

	for (const part of linkPath.split('/')) {
		if (!part || part === '.') continue;
		if (part === '..') {
			stack.pop();
			continue;
		}
		stack.push(part);
	}

	return stack;
}

/** @param {string} baseDir @param {string} linkPath */
function resolveRelative(baseDir, linkPath) {
	return resolveRelativeParts(baseDir.split('/').filter(Boolean), linkPath).join('/');
}

/** @param {string} docsRoot @param {string} targetPath */
function routeFromDocsPath(docsRoot, targetPath) {
	const prefix = `${docsRoot}/`;
	if (!targetPath.startsWith(prefix)) return null;
	return targetPath.slice(prefix.length).replace(/\.(md|txt)$/i, '');
}

/** @param {string} linkUrl @param {string} sourcePath */
export function resolveDocLink(linkUrl, sourcePath) {
	if (!linkUrl.endsWith('.md') && !linkUrl.endsWith('.txt')) return null;

	const docsRoot = docsRootFromSource(sourcePath);
	if (!docsRoot) return null;

	const sourceDir = sourcePath.slice(0, sourcePath.lastIndexOf('/'));
	const targetPath = resolveRelative(sourceDir, linkUrl);
	const route = routeFromDocsPath(docsRoot, targetPath);

	if (!route) return null;
	return hrefFromRoute(route);
}

/** @param {string} href */
function normalizeMarkdownHref(href) {
	return href.replace(/^\.\//, '').replace(/^\//, '').replace(/\.(md|txt)$/i, '');
}

/** @param {string} href @param {string} sourcePath */
export function resolveRepoBlobHref(href, sourcePath) {
	if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
		return null;
	}

	if (!docsRootFromSource(sourcePath)) return null;

	const parts = href.startsWith('/')
		? href.slice(1).split('/').filter(Boolean)
		: resolveRelativeParts(sourceDocDir(sourcePath).split('/').filter(Boolean), href);

	if (!parts.length) return null;

	const repoPath = parts.join('/');
	if (repoPath.startsWith('docs/') || repoPath === 'docs') return null;
	if (!REPO_ROOT_PREFIXES.has(parts[0])) return null;

	return `${REPO_BLOB}/${repoPath}`;
}

/** @param {string} href @param {string} sourcePath */
export function resolveHref(href, sourcePath) {
	if (href.startsWith('/docs/')) {
		return href.replace(/\.(md|txt)$/i, '');
	}

	if (/^\/\d{2}-.+\.md$/i.test(href)) {
		return `/docs/project/user-guide/${href.slice(1).replace(/\.md$/i, '')}`;
	}

	const fromSource = resolveDocLink(href, sourcePath);
	if (fromSource) return fromSource;

	const normalized = normalizeMarkdownHref(href);

	if (/^\d{2}-/i.test(normalized)) {
		return `/docs/project/user-guide/${normalized}`;
	}

	if (normalized === 'install-simple-ip-acme' || href.includes('install-simple-ip-acme')) {
		return '/docs/install-simple-ip-acme';
	}

	return resolveRepoBlobHref(href, sourcePath);
}
