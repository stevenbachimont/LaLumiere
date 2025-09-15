<script lang="ts">
	import MobileButton from '../../lib/components/MobileButton.svelte';
	import SimpleWorkingMeter from '../../lib/components/SimpleWorkingMeter.svelte';

	function goBack() {
		window.history.back();
	}
</script>

<svelte:head>
	<title>Mesure de Lumière - La Lumière</title>
</svelte:head>

<div class="page-container">
	<!-- Header -->
	<div class="header">
		<MobileButton variant="ghost" size="sm" on:click={goBack}>
			← Retour
		</MobileButton>
		<h1>Mesure de Lumière</h1>
	</div>

	<!-- Composant SimpleWorkingMeter -->
	<SimpleWorkingMeter />
</div>

<style>
	.page-container {
		min-height: 100vh;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
	}

	.header {
		background: white;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header h1 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		flex: 1;
		text-align: center;
	}
</style>
