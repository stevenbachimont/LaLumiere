<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from '$lib/sw-register';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		// Enregistrer le service worker
		registerSW();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>La Lumière - App Mobile</title>
	<meta name="description" content="Application mobile moderne développée avec SvelteKit" />
</svelte:head>

<main class="app-container">
	{@render children?.()}
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background-color: #f8fafc;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		max-width: 100vw;
		overflow-x: hidden;
	}

	/* Styles pour mobile */
	@media (max-width: 768px) {
		.app-container {
			padding: 0;
		}
	}

	/* Styles pour les écrans tactiles */
	@media (hover: none) and (pointer: coarse) {
		:global(button, a, input, select, textarea) {
			min-height: 44px;
			min-width: 44px;
		}
	}
</style>
