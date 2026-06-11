/**
 * @typedef {import('mdast').Nodes} Nodes
 *
 * @typedef Options
 *   Configuration (optional).
 * @property {boolean | null | undefined} [includeImageAlt=true]
 *   Whether to use `alt` for `image`s (default: `true`).
 * @property {boolean | null | undefined} [includeHtml=true]
 *   Whether to use `value` of HTML (default: `true`).
 */

/** @type {Options} */
const emptyOptions = {};

/**
 * Get the text content of a node or list of nodes.
 *
 * @param {unknown} [value]
 * @param {Options | null | undefined} [options]
 * @returns {string}
 */
export function toString(value, options) {
	const settings = options || emptyOptions;
	const includeImageAlt =
		typeof settings.includeImageAlt === 'boolean' ? settings.includeImageAlt : true;
	const includeHtml = typeof settings.includeHtml === 'boolean' ? settings.includeHtml : true;

	return one(value, includeImageAlt, includeHtml);
}

/**
 * @param {unknown} value
 * @param {boolean} includeImageAlt
 * @param {boolean} includeHtml
 * @returns {string}
 */
function one(value, includeImageAlt, includeHtml) {
	if (node(value)) {
		if ('value' in value) {
			return value.type === 'html' && !includeHtml ? '' : value.value;
		}

		if (includeImageAlt && 'alt' in value && value.alt) {
			return value.alt;
		}

		if ('children' in value) {
			return all(value.children, includeImageAlt, includeHtml);
		}
	}

	if (Array.isArray(value)) {
		return all(value, includeImageAlt, includeHtml);
	}

	return '';
}

/**
 * @param {Array<unknown>} values
 * @param {boolean} includeImageAlt
 * @param {boolean} includeHtml
 * @returns {string}
 */
function all(values, includeImageAlt, includeHtml) {
	/** @type {Array<string>} */
	const result = [];
	let index = -1;

	while (++index < values.length) {
		result[index] = one(values[index], includeImageAlt, includeHtml);
	}

	return result.join('');
}

/**
 * @param {unknown} value
 * @returns {value is Nodes}
 */
function node(value) {
	return Boolean(value && typeof value === 'object');
}
