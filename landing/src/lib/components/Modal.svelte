<script>
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import panelCenter from '$lib/icons/panel-center.svg?raw';
	import panelLeft from '$lib/icons/panel-left.svg?raw';

	/** @type {{ open?: boolean, title?: string, logo?: string, label?: string, maxWidth?: string, maxHeight?: string, height?: string, dockable?: boolean, docked?: boolean, toolbar?: import('svelte').Snippet, children: import('svelte').Snippet }} */
	let {
		open = $bindable(false),
		title,
		logo,
		label,
		maxWidth = 'var(--modal-max-width)',
		maxHeight = 'var(--modal-max-height)',
		height = '',
		dockable = false,
		docked = $bindable(false),
		toolbar,
		children
	} = $props();

	const duration = 280;

	const canDock = $derived(dockable || Boolean(height));

	const modalStyle = $derived(
		`--modal-width: min(90vw, ${maxWidth}); --modal-height: ${height || maxHeight};`
	);

	function close() {
		open = false;
	}

	function toggleDock() {
		docked = !docked;
	}

	function onkeydown(event) {
		if (open && event.key === 'Escape') close();
	}

	function onscroll() {
		if (open && !docked) close();
	}

	/** @param {HTMLElement} node */
	function modalTransition(node, { duration: ms = duration, easing = cubicInOut } = {}) {
		return {
			duration: ms,
			easing,
			css: (/** @type {number} */ t) => {
				const scale = 0.96 + 0.04 * t;
				return `opacity: ${t}; transform: translate(-50%, -50%) scale(${scale});`;
			}
		};
	}
</script>

<svelte:window onkeydown={onkeydown} onscroll={onscroll} />

{#if open}
	<div
		class="backdrop"
		class:docked={docked}
		role="presentation"
		transition:fade={{ duration, easing: cubicInOut }}
		onclick={close}
	></div>
	<div
		class="modal"
		class:fixed-height={Boolean(height)}
		class:docked={docked}
		style={modalStyle}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		aria-label={!title ? label : undefined}
		transition:modalTransition={{ duration, easing: cubicInOut }}
	>
		<div class="controls">
			{#if canDock}
				<button
					type="button"
					class="dock"
					aria-label={docked ? 'Center modal' : 'Dock to left'}
					aria-pressed={docked}
					onclick={toggleDock}
				>
					<span class="icon" aria-hidden="true">{@html docked ? panelCenter : panelLeft}</span>
				</button>
			{/if}
			<button type="button" class="close" aria-label="Close" onclick={close}>×</button>
		</div>

		{#if title && !logo}
			<h2 id="modal-title">{title}</h2>
		{/if}

		{#if logo}
			<div class="logo-wrap">
				<img class="logo" src={logo} alt={label ?? ''} />
			</div>
		{/if}

		{#if toolbar}
			<div class="toolbar">
				{@render toolbar()}
			</div>
		{/if}

		<div class="body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-overlay);
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 101;
		display: flex;
		flex-direction: column;
		width: var(--modal-width);
		max-height: var(--modal-height);
		overflow: hidden;
		padding: 1.5rem;
		border-radius: 0.75rem;
		background: var(--color-modal-bg);
		box-shadow: 0 1rem 3rem var(--color-shadow);
		color: var(--color-modal-text);
		transform: translate(-50%, -50%);
		transition:
			var(--transition-theme),
			top 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			left 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			height 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			border-radius 0.28s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.modal.docked {
		top: 0;
		left: 0;
		width: var(--modal-docked-width);
		height: 100dvh;
		max-height: 100dvh;
		transform: none;
		border-radius: 0;
		box-shadow: none;
	}

	.backdrop.docked {
		background: transparent;
		pointer-events: none;
	}

	.modal.fixed-height {
		height: var(--modal-height);
	}

	.modal.fixed-height.docked {
		height: 100dvh;
	}

	.controls {
		position: absolute;
		top: calc(1rem - 2px);
		right: 1rem;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	h2 {
		flex-shrink: 0;
		margin: 0 0 0.75rem;
		padding-right: 2.5rem;
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.modal:has(.dock) h2 {
		padding-right: 4.5rem;
	}

	.toolbar {
		flex-shrink: 0;
		margin-bottom: 0.85rem;
	}

	.logo-wrap {
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		padding: 20px 0 40px;
	}

	.logo {
		height: 7rem;
		width: auto;
	}

	.close,
	.dock {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.85rem;
		height: 1.85rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: var(--color-close-bg);
		font-size: 1.25rem;
		line-height: 1;
		color: var(--color-close-fg);
		cursor: pointer;
	}

	.dock {
		font-size: 1rem;
	}

	.dock[aria-pressed='true'] {
		background: var(--color-border-strong);
		color: var(--color-modal-text);
	}

	.close:hover,
	.dock:hover {
		background: var(--color-close-hover-bg);
		color: var(--color-modal-text);
	}

	.icon :global(svg) {
		display: block;
		width: 1rem;
		height: 1rem;
	}

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--color-modal-text);
		scrollbar-width: thin;
		scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
	}

	.body::-webkit-scrollbar {
		width: 0.5rem;
	}

	.body::-webkit-scrollbar-track {
		border-radius: 0.25rem;
		background: var(--color-scrollbar-track);
	}

	.body::-webkit-scrollbar-thumb {
		border: 2px solid var(--color-scrollbar-track);
		border-radius: 0.25rem;
		background: var(--color-scrollbar-thumb);
	}

	.body::-webkit-scrollbar-thumb:hover {
		background: var(--color-scrollbar-thumb-hover);
	}

	.body :global(p:not(.modal-links)) {
		margin: 0 0 0.75rem;
		text-align: justify;
		hyphens: auto;
	}

	.body :global(p.modal-links) {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		margin: 0;
		padding: 2.25rem 0;
		text-align: center;
		hyphens: none;
	}

	.body :global(p.modal-links .sep) {
		margin: 0 0.75rem;
		color: var(--color-modal-text-faint);
		user-select: none;
	}

	.body :global(p:last-child) {
		margin-bottom: 0;
	}

	.body :global(a) {
		color: var(--color-modal-text);
	}

	.body :global(p.modal-links a) {
		text-decoration: none;
	}

	.body :global(p.modal-links a:hover) {
		color: var(--color-modal-text);
		text-decoration: underline;
		text-decoration-color: var(--color-modal-link-hover);
	}

	.body :global(a:hover) {
		text-decoration: none;
	}
</style>
