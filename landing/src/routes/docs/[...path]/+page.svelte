<script>
	import DocDirListing from '$lib/components/DocDirListing.svelte';
	import DocPage from '$lib/components/DocPage.svelte';

	let { data } = $props();
</script>

{#key data.href}
	<DocPage href={data.href}>
		{#if data.kind === 'dir'}
			<DocDirListing title={data.title} entries={data.entries} />
		{:else if data.Content}
			<data.Content />
		{:else if data.html}
			{@html data.html}
		{/if}
	</DocPage>
{/key}
