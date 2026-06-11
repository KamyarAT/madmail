<script>
	import { browser } from '$app/environment';
	import DocBreadcrumb from '$lib/components/DocBreadcrumb.svelte';
	import DocPageActions from '$lib/components/DocPageActions.svelte';
	import MadmailLogo from '$lib/components/MadmailLogo.svelte';
	import { openCommandPalette } from '$lib/commandPalette.svelte.js';
	import { openDocTree } from '$lib/docTreeModal.svelte.js';
	import chevronLeft from '$lib/icons/chevron-left.svg?raw';
	import github from '$lib/icons/github.svg?raw';
	import magnifyingGlass from '$lib/icons/magnifying-glass.svg?raw';
	import queueList from '$lib/icons/queue-list.svg?raw';
	import { repo } from '$lib/nav.js';

	/** @type {{ currentHref?: string }} */
	let { currentHref = '' } = $props();

	let scrolled = $state(false);
	let progress = $state(0);

	function goBack() {
		if (!browser) return;
		history.back();
	}

	$effect(() => {
		if (!browser) return;

		const onScroll = () => {
			scrolled = window.scrollY > 48;
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
		};

		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

<header class="doc-header" class:scrolled={scrolled}>
	<div class="brand">
		<div class="brand-start">
			<button type="button" class="back" aria-label="Back" onclick={goBack}>
				<span class="icon" aria-hidden="true">{@html chevronLeft}</span>
			</button>
			<button
				type="button"
				class="docs-tree"
				aria-label="Documentation tree"
				onclick={openDocTree}
			>
				<span class="icon" aria-hidden="true">{@html queueList}</span>
			</button>
		</div>
		<MadmailLogo href="/" size="2rem" class="doc-logo" transitionName="madmail-logo" />
		<div class="brand-end">
			<button
				type="button"
				class="search"
				aria-label="Search pages"
				onclick={() => openCommandPalette()}
			>
				<span class="icon" aria-hidden="true">{@html magnifyingGlass}</span>
			</button>
			<a
				href={repo}
				class="github"
				aria-label="GitHub repository"
				target="_blank"
				rel="noopener noreferrer"
			>
				<span class="icon" aria-hidden="true">{@html github}</span>
			</a>
		</div>
	</div>
	<div class="subheader">
		<DocBreadcrumb {currentHref} />
		<DocPageActions {currentHref} />
	</div>
	<div class="scroll-progress" aria-hidden="true" style="transform: scaleX({progress})"></div>
</header>

<style>
	.doc-header {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		max-width: 48rem;
		margin: 0 auto 2rem;
		padding: 2rem 0 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
		transition: var(--transition-theme);
	}

	@media (max-width: 640px) {
		.doc-header {
			padding: 1.25rem 0 1rem;
			margin-bottom: 1.5rem;
		}
	}

	.scroll-progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--color-text);
		transform: scaleX(0);
		transform-origin: left;
		opacity: 0;
		transition: opacity 0.25s ease;
		pointer-events: none;
	}

	.doc-header.scrolled .scroll-progress {
		opacity: 1;
	}

	.brand {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}

	.brand :global(.doc-logo) {
		grid-column: 2;
		justify-self: center;
	}

	.subheader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2rem;
		opacity: 1;
		transition: opacity 0.35s ease;
	}

	.subheader :global(.breadcrumb) {
		flex: 1;
		min-width: 0;
	}

	.subheader :global(.doc-page-actions) {
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.subheader {
			flex-direction: column;
			align-items: stretch;
			gap: 0.65rem;
		}
	}

	.doc-header.scrolled .subheader {
		opacity: 0.2;
		pointer-events: none;
	}

	.doc-header.scrolled:hover .subheader {
		opacity: 1;
		pointer-events: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.subheader {
			transition: none;
		}

		.doc-header.scrolled .subheader {
			opacity: 1;
			pointer-events: auto;
		}
	}

	.brand-start {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		grid-column: 1;
		justify-self: start;
	}

	.brand-end {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		grid-column: 3;
		justify-self: end;
	}

	.back,
	.docs-tree,
	.search {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: none;
		border-radius: 0.5rem;
		background: transparent;
		color: var(--color-text-subtle);
		cursor: pointer;
	}

	.back:hover,
	.docs-tree:hover,
	.search:hover {
		background: var(--color-hover);
		color: var(--color-text);
	}

	.github {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		color: var(--color-text-subtle);
		text-decoration: none;
	}

	.github:hover {
		background: var(--color-hover);
		color: var(--color-text);
	}

	.icon :global(svg) {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
