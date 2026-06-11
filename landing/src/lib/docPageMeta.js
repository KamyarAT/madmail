import { descriptionFromMarkdown, descriptionFromPlainText } from './docDescription.js';
import { findDirById, readmeHrefForDir, docTreeNodes } from './docTreeData.js';
import { isTxtRoute, labelFromRoute, routeFromHref } from './docs.js';
import { loadRawDoc } from './rawDocModules.js';
import { defaultDescription } from './siteMeta.js';

/** @param {string} route */
export async function docMetaForRoute(route) {
	const title = labelFromRoute(route);
	const raw = await loadRawDoc(route);

	if (!raw) {
		return { title, description: defaultDescription };
	}

	const description = isTxtRoute(route)
		? descriptionFromPlainText(raw, title)
		: descriptionFromMarkdown(raw) || defaultDescription;

	return { title, description };
}

/** @param {import('./docTreeData.js').DocTreeDir} dir */
export async function dirMetaForDir(dir) {
	const readmeHref = readmeHrefForDir(dir);

	if (readmeHref) {
		const route = routeFromHref(readmeHref);
		const meta = await docMetaForRoute(route);
		return {
			title: dir.label,
			description: meta.description
		};
	}

	return {
		title: dir.label,
		description: `Browse ${dir.label} in the Madmail documentation.`
	};
}

/** @param {string} route */
export async function findDirMeta(route) {
	const dir = findDirById(docTreeNodes, route);

	if (!dir) return null;

	return dirMetaForDir(dir);
}
