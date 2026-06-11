<script>
	import Modal from '$lib/components/Modal.svelte';
	import { ancestorIdsForDirId, ancestorIdsForHref, docTreeNodes } from '$lib/docTreeData.js';
	import { collectDirIds, filterDocTree } from '$lib/docTreeFilter.js';
	import { resolveDocHref, sameDocPage } from '$lib/docs.js';
	import { closeDocTree, docTreeModal } from '$lib/docTreeModal.svelte.js';
	import chevronRight from '$lib/icons/chevron-right.svg?raw';
	import magnifyingGlass from '$lib/icons/magnifying-glass.svg?raw';

	/** @type {{ currentHref?: string }} */
	let { currentHref = '' } = $props();

	let query = $state('');
	/** @type {'all' | 'user-guide' | 'reference'} */
	let filter = $state('all');

	/** @type {Set<string>} */
	let collapsedIds = $state(new Set());

	const isFiltering = $derived(query.trim().length > 0 || filter !== 'all');
	const visibleNodes = $derived(filterDocTree(docTreeNodes, query, filter));

	/** @param {string} id */
	function isExpanded(id) {
		if (isFiltering) return true;
		return !collapsedIds.has(id);
	}

	/** @param {string} id */
	function toggleNode(id) {
		const next = new Set(collapsedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		collapsedIds = next;
	}

	function onFileClick() {
		if (!docTreeModal.docked) closeDocTree();
	}

	/** @param {import('$lib/docTreeData.js').DocTreeNode} node */
	function isActive(node) {
		return node.type === 'file' && sameDocPage(node.href, currentHref);
	}

	$effect(() => {
		if (!docTreeModal.open) {
			query = '';
			filter = 'all';
			docTreeModal.focusDirId = null;
			return;
		}

		if (isFiltering) return;

		const next = new Set();
		collectDirIds(docTreeNodes, next);

		const focusDirId = docTreeModal.focusDirId;
		if (focusDirId === '__root__') {
			for (const node of docTreeNodes) {
				if (node.type === 'dir') next.delete(node.id);
			}
		} else if (focusDirId) {
			const ancestors = ancestorIdsForDirId(docTreeNodes, focusDirId) ?? [];
			for (const id of [...ancestors, focusDirId]) next.delete(id);
		} else {
			const ancestors = ancestorIdsForHref(docTreeNodes, resolveDocHref(currentHref)) ?? [];
			for (const id of ancestors) next.delete(id);
		}

		collapsedIds = next;
	});
</script>

{#snippet toolbar()}
	<div class="doc-tree-toolbar">
		<label class="search">
			<span class="icon" aria-hidden="true">{@html magnifyingGlass}</span>
			<input
				type="search"
				placeholder="Search documentation…"
				bind:value={query}
				aria-label="Search documentation"
			/>
		</label>
		<label class="filter">
			<span class="filter-label">Show</span>
			<select bind:value={filter} aria-label="Filter documentation">
				<option value="all">All docs</option>
				<option value="user-guide">User guide</option>
				<option value="reference">Reference</option>
			</select>
		</label>
	</div>
{/snippet}

<Modal
	bind:open={docTreeModal.open}
	bind:docked={docTreeModal.docked}
	title="Documentation"
	maxWidth="var(--modal-max-width-lg)"
	height="var(--modal-height-lg)"
	label="Documentation"
	{toolbar}
>
	<nav class="doc-tree" aria-label="Documentation pages">
		{#if visibleNodes.length}
			<ul class="tree-root">
				{#each visibleNodes as node (node.id)}
					{@render treeNode(node, 0)}
				{/each}
			</ul>
		{:else}
			<p class="empty">No documentation matches your search.</p>
		{/if}
	</nav>
</Modal>

{#snippet treeNode(node, depth)}
	<li class="node" class:dir={node.type === 'dir'}>
		{#if node.type === 'dir'}
			<div class="node-head">
				<button
					type="button"
					class="collapse"
					aria-expanded={isExpanded(node.id)}
					aria-label="{isExpanded(node.id) ? 'Collapse' : 'Expand'} {node.label}"
					onclick={() => toggleNode(node.id)}
				>
					<span class="icon" aria-hidden="true">{@html chevronRight}</span>
				</button>
				<button
					type="button"
					class="dir-label"
					aria-expanded={isExpanded(node.id)}
					onclick={() => toggleNode(node.id)}
				>
					{node.label}
				</button>
			</div>

			{#if isExpanded(node.id)}
				<ul class="nested">
					{#each node.children as child (child.id)}
						{@render treeNode(child, depth + 1)}
					{/each}
				</ul>
			{/if}
		{:else}
			<a href={node.href} class="file-link" class:active={isActive(node)} onclick={onFileClick}>
				{node.label}
			</a>
		{/if}
	</li>
{/snippet}

<style>
	.doc-tree-toolbar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex: 1;
		min-width: 0;
		padding: 0.4rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-surface);
		color: var(--color-modal-text-faint);
	}

	.search:focus-within {
		border-color: var(--color-border-strong);
		color: var(--color-modal-text);
	}

	.search input {
		width: 100%;
		min-width: 0;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-modal-text);
		font: inherit;
		font-size: 0.8rem;
		line-height: 1.3;
		outline: none;
	}

	.search input::placeholder {
		color: var(--color-modal-text-faint);
	}

	.filter {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.filter-label {
		font-size: 0.75rem;
		color: var(--color-modal-text-faint);
	}

	.filter select {
		padding: 0.4rem 1.6rem 0.4rem 0.55rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-surface);
		color: var(--color-modal-text);
		font: inherit;
		font-size: 0.8rem;
		line-height: 1.3;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8a' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.35rem center;
		background-size: 0.85rem;
	}

	.filter select:focus {
		outline: none;
		border-color: var(--color-border-strong);
	}

	.doc-tree {
		display: flex;
		flex-direction: column;
	}

	.node-head {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.collapse {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: var(--color-modal-text-faint);
		cursor: pointer;
	}

	.collapse:hover {
		background: var(--color-hover);
		color: var(--color-modal-text);
	}

	.collapse[aria-expanded='true'] .icon :global(svg) {
		transform: rotate(90deg);
	}

	.icon :global(svg) {
		display: block;
		width: 0.85rem;
		height: 0.85rem;
		transition: transform 0.15s ease;
	}

	.search .icon :global(svg) {
		width: 0.9rem;
		height: 0.9rem;
		flex-shrink: 0;
	}

	.file-link {
		display: block;
		padding: 0.3rem 0;
		color: var(--color-modal-text);
		font-size: 0.875rem;
		line-height: 1.4;
		text-decoration: none;
	}

	.dir-label {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.4;
		color: var(--color-modal-text);
		text-align: left;
		cursor: pointer;
	}

	.dir-label:hover {
		color: var(--color-modal-link-hover);
	}

	.tree-root,
	.nested {
		margin: 0.15rem 0 0;
		padding: 0;
		list-style: none;
	}

	.nested {
		margin-left: 0.35rem;
		padding-left: 0.55rem;
		border-left: 1px solid var(--color-border);
	}

	.node.dir + .node,
	.node + .node {
		margin-top: 0.1rem;
	}

	.node .file-link {
		padding-left: 1.85rem;
	}

	.tree-root > .node > .file-link {
		padding-left: 0;
	}

	.empty {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: var(--color-modal-text-faint);
	}

	.file-link:hover {
		color: var(--color-modal-text);
		text-decoration: underline;
		text-decoration-color: var(--color-modal-link-hover);
	}

	.file-link.active {
		position: relative;
		margin-left: -0.45rem;
		padding-left: 0.45rem;
		color: var(--color-modal-text);
		font-weight: 600;
	}

	.node .file-link.active {
		padding-left: calc(1.85rem + 0.45rem);
	}

	.file-link.active::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 1rem;
		width: 0.2rem;
		height: 0.95rem;
		border-radius: 0.1rem;
		background: var(--color-doc-tree-active-indicator);
		transform: translateY(-50%);
	}

	.tree-root > .node > .file-link.active {
		padding-left: 0.45rem;
	}

	.tree-root > .node > .file-link.active::before {
		left: 0;
	}
</style>
