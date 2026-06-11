<script>
	import Modal from '$lib/components/Modal.svelte';
	import { deltachatLinks } from '$lib/data.js';

	let { open = $bindable(false) } = $props();
</script>

<Modal
	bind:open
	logo="https://delta.chat/assets/logos/delta-chat.svg"
	label="Delta Chat"
>
	<p>
		<strong>Delta Chat</strong> turns normal email (IMAP + SMTP) into a fast, encrypted messaging
		experience. No new protocol to learn, no closed network to join.
	</p>
	<p>
		It works best on a proper <strong>chatmail relay</strong> like Madmail: instant push, reliable
		calls, strong privacy defaults, and easy onboarding.
	</p>
	<p class="modal-links">
		{#each deltachatLinks as link, i}
			{#if i > 0}<span class="sep" aria-hidden="true">·</span>{/if}
			<a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
		{/each}
	</p>
</Modal>
