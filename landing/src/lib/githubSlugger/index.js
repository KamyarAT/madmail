import { regex } from './regex.js';

const own = Object.hasOwnProperty;

/**
 * Slugger with GitHub-compatible duplicate handling.
 */
export default class GithubSlugger {
	constructor() {
		this.reset();
	}

	reset() {
		/** @type {Record<string, number>} */
		this.occurrences = Object.create(null);
	}

	/**
	 * @param {string} value
	 * @param {boolean} [maintainCase=false]
	 * @returns {string}
	 */
	slug(value, maintainCase) {
		let result = slug(value, maintainCase === true);
		const originalSlug = result;

		while (own.call(this.occurrences, result)) {
			this.occurrences[originalSlug]++;
			result = originalSlug + '-' + this.occurrences[originalSlug];
		}

		this.occurrences[result] = 0;

		return result;
	}
}

/**
 * @param {string} value
 * @param {boolean} [maintainCase=false]
 * @returns {string}
 */
export function slug(value, maintainCase) {
	if (typeof value !== 'string') return '';
	if (!maintainCase) value = value.toLowerCase();
	return value.replace(regex, '').replace(/ /g, '-');
}
