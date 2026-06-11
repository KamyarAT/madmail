<script>
	import { resources } from '$lib/data.js';
	import { repo } from '$lib/nav.js';
</script>

<footer>
	<nav aria-label="Resources">
		{#each resources as link}
			<a href={link.href}>{link.label}</a>
		{/each}
	</nav>
	<p class="license">
		<a href="{repo}/blob/main/LICENCE">AGPL-3.0-or-later</a> · Use at your own risk. Validate for your
		threat model before production use.
	</p>
</footer>

<style>
	footer {
		max-width: 42rem;
		margin: 0 auto;
		padding: 3.5rem 1.5rem 4rem;
		text-align: center;
		color: var(--color-text);
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem 1.25rem;
		margin-bottom: 1.25rem;
	}

	a {
		font-size: 0.9rem;
		color: var(--color-text-subtle);
		text-decoration: none;
	}

	a:hover {
		color: var(--color-text);
		text-decoration: underline;
	}

	.license {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-text-faint);
	}
</style>
