<script lang="ts">
	import { onMount } from 'svelte';
	import MobileButton from '$lib/components/MobileButton.svelte';
	import MobileCard from '$lib/components/MobileCard.svelte';

	let isOnline = true;
	let installPrompt: any = null;

	onMount(() => {
		// Vérifier la connectivité
		isOnline = navigator.onLine;
		window.addEventListener('online', () => isOnline = true);
		window.addEventListener('offline', () => isOnline = false);

		// Gérer l'installation PWA
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			installPrompt = e;
		});
	});

	async function installApp() {
		if (installPrompt) {
			installPrompt.prompt();
			const { outcome } = await installPrompt.userChoice;
			console.log(`Installation ${outcome}`);
			installPrompt = null;
		}
	}

	function handleStart() {
		console.log('Commencer l\'application');
		// Ici vous pouvez ajouter la logique pour naviguer vers la page suivante
	}

	function navigateToMesures() {
		window.location.href = '/mesures';
	}

	function navigateToNumerise() {
		window.location.href = '/numerise';
	}

	function navigateToChallenges() {
		window.location.href = '/challenges';
	}
</script>

<svelte:head>
	<title>Accueil - La Lumière</title>
</svelte:head>

<div class="hero-section">
	<div class="hero-content">
		<div class="app-icon">
			<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="80" height="80" rx="16" fill="#000000"/>
				<circle cx="40" cy="40" r="20" fill=#FF69B4/>
				<circle cx="40" cy="40" r="10" fill="#000000"/>
			</svg>
		</div>
		<h1>La Lumière</h1>
		<p class="subtitle">De La Ligne Argentique</p>
	</div>
</div>

<div class="features-section">
	<MobileCard
		title="Mesures"
		subtitle="Mesurez la lumière et ajustez vos réglages"
		icon="📱"
		clickable={true}
		on:click={navigateToMesures}
	/>
	
	<MobileCard
		title="Numerise"
		subtitle="Photographiez vos négatifs et numérisez-les"
		icon="⚡"
		clickable={true}
		on:click={navigateToNumerise}
	/>
	
	<MobileCard
		title="Challenges"
		subtitle="Promenez vous pour obtenir les meilleurs cadrages"
		icon="🔧"
		clickable={true}
		on:click={navigateToChallenges}
	/>
</div>



<style>
	.hero-section {
		background: linear-gradient(135deg, #36383c 0%, #000000 100%);
		color: white;
		padding: 2rem 1.5rem 3rem;
		text-align: center;
		border-radius: 0 0 2rem 2rem;
		margin-bottom: 2rem;
	}

	.hero-content {
		max-width: 400px;
		margin: 0 auto;
	}

	.app-icon {
		margin-bottom: 1rem;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: 1.1rem;
		opacity: 0.9;
		margin: 0 0 1.5rem 0;
	}


	.features-section {
		padding: 0 1.5rem 2rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}




	/* Responsive design */
	@media (min-width: 640px) {
		.features-section {
			grid-template-columns: repeat(3, 1fr);
		}
		
		.hero-section {
			padding: 3rem 2rem 4rem;
		}
		
		h1 {
			font-size: 3rem;
		}
	}

	/* Animations d'entrée */
	.hero-section {
		animation: fadeInUp 0.6s ease-out;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
