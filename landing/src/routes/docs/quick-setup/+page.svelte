<script>
	import DocPage from '$lib/components/DocPage.svelte';

	let { data } = $props();
</script>

{#key data.href}
	<DocPage href={data.href}>
		{#if data.Content}
			<data.Content />
		{:else if data.html}
			{@html data.html}
		{/if}
	</DocPage>
{/key}
