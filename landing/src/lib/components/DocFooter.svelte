<script>
	import { getDocNeighbors } from '$lib/nav.js';
	import chevronLeft from '$lib/icons/chevron-left.svg?raw';
	import chevronRight from '$lib/icons/chevron-right.svg?raw';

	/** @type {{ href: string }} */
	let { href } = $props();

	const { prev, next } = $derived(getDocNeighbors(href));
</script>

{#if prev || next}
	<nav class="doc-footer" aria-label="Documentation navigation">
		{#if prev}
			<a class="nav-btn prev" href={prev.href}>
				<span class="icon" aria-hidden="true">{@html chevronLeft}</span>
				<span class="label">
					<span class="hint">Previous</span>
					{prev.label}
				</span>
			</a>
		{:else}
			<span></span>
		{/if}

		{#if next}
			<a class="nav-btn next" href={next.href}>
				<span class="label">
					<span class="hint">Next</span>
					{next.label}
				</span>
				<span class="icon" aria-hidden="true">{@html chevronRight}</span>
			</a>
		{/if}
	</nav>
{/if}

<style>
	.doc-footer {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 1rem;
		max-width: 48rem;
		margin: 3rem auto 0;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		max-width: 14rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border-input);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
		text-decoration: none;
		transition: border-color 0.15s, background 0.15s, color 0.15s;
	}

	.nav-btn:hover {
		border-color: var(--color-hover-border);
		background: var(--color-hover);
	}

	.next {
		margin-left: auto;
		text-align: right;
	}

	.label {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		line-height: 1.3;
	}

	.hint {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--color-text-faint);
	}

	.icon :global(svg) {
		display: block;
		flex-shrink: 0;
		width: 1.1rem;
		height: 1.1rem;
	}
</style>
