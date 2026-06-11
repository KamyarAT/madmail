<script>
	import DocPage from '$lib/components/DocPage.svelte';

	let { data } = $props();
</script>

{#key data.href}
	<DocPage href={data.href}>
		<data.Content />
	</DocPage>
{/key}
