<script>
	/** @type {{ links: { label: string, href: string }[], class?: string, currentHref?: string }} */
	let { links, class: className = '', currentHref = '' } = $props();
</script>

<nav class={className} aria-label="Documentation">
	{#each links as link}
		<a
			href={link.href}
			class:active={currentHref === link.href}
			aria-current={currentHref === link.href ? 'page' : undefined}
		>
			{link.label}
		</a>
	{/each}
</nav>
