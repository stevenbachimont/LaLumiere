<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from './Camera.svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';

	// Props
	export let onComplete: (success: boolean) => void;
	export let onBack: () => void;

	// États
	let cameraComponent: Camera;
	let hasPermission = false;
	let isCapturing = false;
	let showOverlay = true;
	let opacity = 0.5;
	let challengeImage: string | null = null;

	// Types de challenges disponibles
	const challengeTypes: Record<string, { name: string; images: string[] }> = {
		commerce: {
			name: 'Commerce',
			images: [
				'/challenges/cadrages/commerce/reference-image.svg',
				'/challenges/cadrages/commerce/commerce.jpg'
			]
		}
	};

	// Challenge actuel (par défaut: commerce)
	let currentChallengeType: string = 'commerce';
	let currentImageIndex = 0;
	
	// Variables réactives
	$: referenceImages = challengeTypes[currentChallengeType].images;
	$: referenceImage = referenceImages[currentImageIndex];

	function handleCameraReady() {
		hasPermission = true;
		console.log('Caméra prête pour le challenge CADRER');
	}

	function handleCameraError(error: Error) {
		hasPermission = false;
		console.error('Erreur caméra:', error);
	}

	function capturePhoto() {
		if (!cameraComponent) return;

		isCapturing = true;
		const imageData = cameraComponent.captureImage();
		
		if (imageData) {
			challengeImage = imageData;
			// Simuler un délai de traitement
			setTimeout(() => {
				isCapturing = false;
			}, 1000);
		}
	}

	function toggleOverlay() {
		showOverlay = !showOverlay;
	}

	function adjustOpacity(event: Event) {
		const target = event.target as HTMLInputElement;
		opacity = parseFloat(target.value);
	}

	function completeChallenge() {
		onComplete(true);
	}

	function abandonChallenge() {
		onComplete(false);
	}

	function nextImage() {
		currentImageIndex = (currentImageIndex + 1) % referenceImages.length;
		console.log('Image suivante:', currentImageIndex, referenceImage);
	}

	function previousImage() {
		currentImageIndex = currentImageIndex === 0 ? referenceImages.length - 1 : currentImageIndex - 1;
		console.log('Image précédente:', currentImageIndex, referenceImage);
	}

	function changeChallengeType(newType: string) {
		currentChallengeType = newType;
		currentImageIndex = 0; // Réinitialiser l'index
	}
</script>

<div class="cadrer-challenge">
	<!-- Header -->
	<div class="challenge-header">
		<MobileButton variant="ghost" size="sm" on:click={onBack}>
			← Retour
		</MobileButton>
		<h1>Challenge CADRER</h1>
		<div class="challenge-subtitle">
			{challengeTypes[currentChallengeType].name} - Recréez exactement le cadrage de l'image de référence
		</div>
	</div>

	<!-- Zone de capture -->
	<div class="capture-section">
		<MobileCard title="Cadrage en temps réel" class="camera-card">
			<div class="camera-container">
				<Camera
					bind:this={cameraComponent}
					width={400}
					height={300}
					facingMode="environment"
					onCameraReady={handleCameraReady}
					onError={handleCameraError}
				>
					{#if hasPermission}
						<!-- Overlay de l'image de référence -->
						{#if showOverlay}
							<div 
								class="reference-overlay"
								style="opacity: {opacity};"
							>
								<img 
									src={referenceImage} 
									alt=""
									class="reference-image"
								/>
							</div>
						{/if}
						
						<!-- Guides de cadrage -->
						<div class="framing-guides">
							<div class="guide-line vertical left"></div>
							<div class="guide-line vertical right"></div>
							<div class="guide-line horizontal top"></div>
							<div class="guide-line horizontal bottom"></div>
						</div>
					{/if}
				</Camera>
			</div>

			<!-- Contrôles -->
			<div class="controls">
				<div class="overlay-controls">
					<label class="control-label">
						<input 
							type="checkbox" 
							bind:checked={showOverlay}
							class="checkbox"
						/>
						Afficher l'overlay
					</label>
					
					{#if showOverlay}
						<label class="control-label">
							Opacité: {Math.round(opacity * 100)}%
							<input 
								type="range" 
								min="0.1" 
								max="1" 
								step="0.1" 
								bind:value={opacity}
								class="opacity-slider"
							/>
						</label>
					{/if}
				</div>

				<!-- Contrôles d'image -->
				<div class="image-controls">
					<div class="control-label">
						Image de référence ({referenceImage.endsWith('.svg') ? 'SVG' : 'JPG'})
					</div>
					<div class="image-info">
						<span class="image-name">
							{referenceImage.split('/').pop()?.split('.')[0] || 'Image'}
						</span>
					</div>
					<div class="image-selector">
						<MobileButton variant="outline" size="sm" on:click={previousImage}>
							← Précédente
						</MobileButton>
						<span class="image-counter">{currentImageIndex + 1} / {referenceImages.length}</span>
						<MobileButton variant="outline" size="sm" on:click={nextImage}>
							Suivante →
						</MobileButton>
					</div>
				</div>

				<div class="capture-actions">
					<MobileButton 
						variant="primary" 
						on:click={capturePhoto}
						disabled={!hasPermission || isCapturing}
						class="capture-button"
					>
						{#if isCapturing}
							📸 Capture...
						{:else}
							📸 Capturer
						{/if}
					</MobileButton>
				</div>
			</div>
		</MobileCard>
	</div>

	<!-- Image capturée -->
	{#if challengeImage}
		<div class="result-section">
			<MobileCard title="Votre photo" class="result-card">
				<div class="result-image">
					<img src={challengeImage} alt="" />
				</div>
				<div class="result-actions">
					<MobileButton 
						variant="primary" 
						on:click={completeChallenge}
						class="success-button"
					>
						✅ Valider le cadrage
					</MobileButton>
					<MobileButton 
						variant="outline" 
						on:click={() => challengeImage = null}
					>
						🔄 Reprendre
					</MobileButton>
				</div>
			</MobileCard>
		</div>
	{/if}

	<!-- Instructions -->
	<div class="instructions-section">
		<MobileCard title="Instructions" class="instructions-card">
			<div class="instructions-content">
				<div class="instruction-item">
					<div class="instruction-icon">🎯</div>
					<div class="instruction-text">
						<strong>Objectif :</strong> Recréez exactement le cadrage de l'image de référence
					</div>
				</div>
				<div class="instruction-item">
					<div class="instruction-icon">👁️</div>
					<div class="instruction-text">
						<strong>Conseil :</strong> Ajustez l'opacité de l'overlay pour mieux voir votre cadrage
					</div>
				</div>
				<div class="instruction-item">
					<div class="instruction-icon">📐</div>
					<div class="instruction-text">
						<strong>Astuce :</strong> Utilisez les guides de cadrage pour vous aider
					</div>
				</div>
			</div>
		</MobileCard>
	</div>

	<!-- Actions finales -->
	<div class="final-actions">
		<MobileButton 
			variant="ghost" 
			on:click={abandonChallenge}
			class="abandon-button"
		>
			❌ Abandonner le challenge
		</MobileButton>
	</div>
</div>

<style>
	.cadrer-challenge {
		min-height: 100vh;
		background: #f8fafc;
		padding: 1rem;
	}

	.challenge-header {
		background: white;
		padding: 1rem 1.5rem;
		border-radius: 1rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.challenge-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0.5rem 0 0.25rem 0;
	}

	.challenge-subtitle {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.capture-section {
		margin-bottom: 1.5rem;
	}

	.camera-card {
		overflow: hidden;
	}

	.camera-container {
		position: relative;
		width: 100%;
		height: 300px;
		background: #000;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.reference-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 10;
	}

	.reference-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.framing-guides {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.guide-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.8);
	}

	.guide-line.vertical {
		width: 1px;
		height: 100%;
	}

	.guide-line.horizontal {
		width: 100%;
		height: 1px;
	}

	.guide-line.vertical.left {
		left: 33.33%;
	}

	.guide-line.vertical.right {
		left: 66.66%;
	}

	.guide-line.horizontal.top {
		top: 33.33%;
	}

	.guide-line.horizontal.bottom {
		top: 66.66%;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.overlay-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
	}

	.checkbox {
		width: 16px;
		height: 16px;
	}

	.opacity-slider {
		width: 100%;
		margin-top: 0.25rem;
	}

	.capture-actions {
		display: flex;
		justify-content: center;
	}

	.capture-button {
		font-size: 1.1rem;
		padding: 0.75rem 2rem;
	}

	.result-section {
		margin-bottom: 1.5rem;
	}

	.result-image {
		width: 100%;
		height: 200px;
		background: #000;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.result-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.result-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.success-button {
		background: #10b981;
		border-color: #10b981;
	}

	.success-button:hover {
		background: #059669;
		border-color: #059669;
	}

	.instructions-section {
		margin-bottom: 1.5rem;
	}

	.instructions-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.instruction-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.instruction-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.instruction-text {
		font-size: 0.875rem;
		line-height: 1.4;
		color: #374151;
	}

	.final-actions {
		display: flex;
		justify-content: center;
	}

	.abandon-button {
		color: #ef4444;
		border-color: #ef4444;
	}

	.abandon-button:hover {
		background: #fef2f2;
	}

	.image-controls {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.image-selector {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.image-counter {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
		min-width: 60px;
		text-align: center;
	}

	.image-info {
		margin: 0.5rem 0;
		text-align: center;
	}

	.image-name {
		font-size: 0.875rem;
		color: #374151;
		font-weight: 600;
		background: #f3f4f6;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		display: inline-block;
	}
</style>
