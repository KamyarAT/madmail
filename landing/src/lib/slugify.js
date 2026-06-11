import { slug } from './githubSlugger/index.js';

/** @param {string} text */
export function slugifyHeading(text) {
	return slug(text);
}

/** @param {string} text @param {Set<string>} used */
export function uniqueSlug(text, used) {
	let base = slug(text);
	if (!base) base = 'section';

	let unique = base;
	let index = 1;
	while (used.has(unique)) {
		unique = `${base}-${index++}`;
	}

	used.add(unique);
	return unique;
}
