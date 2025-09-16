<script lang="ts">
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';
	import Camera from './Camera.svelte';

	// États de l'application
	let isCapturing = false;
	let cameraComponent: Camera;
	let hasPermission = false;
	let videoElement: HTMLVideoElement | undefined = undefined;

	// Images capturées
	let capturedImages: string[] = [];
	let currentImage: string | null = null;
	
	// États de traitement des négatifs
	let isGrayscale = true;
	let isInverted = false;
	let brightness = 0;
	let contrast = 100;
	let showPreview = false;

	function handleCameraReady() {
		hasPermission = true;
		videoElement = cameraComponent.videoElement;
		console.log('Caméra prête pour la numérisation');
	}

	function handleCameraError(error: Error) {
		hasPermission = false;
		console.error('Erreur caméra:', error);
	}

	function captureImage() {
		if (!cameraComponent) return;

		// Utiliser le composant Camera pour capturer et traiter l'image
		const imageData = cameraComponent.processImage(processNegativeImage);
		
		if (imageData) {
			capturedImages = [...capturedImages, imageData];
			currentImage = imageData;
			
			// Effet de flash
			isCapturing = true;
			setTimeout(() => {
				isCapturing = false;
			}, 200);
		}
	}

	function processNegativeImage(imageData: ImageData): ImageData {
		const data = imageData.data;
		
		// Traiter chaque pixel
		for (let i = 0; i < data.length; i += 4) {
			let r = data[i];
			let g = data[i + 1];
			let b = data[i + 2];
			
			// Convertir en niveaux de gris si activé
			if (isGrayscale) {
				const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
				r = g = b = gray;
			}
			
			// Inverser les couleurs si activé (négatif → positif)
			if (isInverted) {
				r = 255 - r;
				g = 255 - g;
				b = 255 - b;
			}
			
			// Ajuster la luminosité
			r = Math.max(0, Math.min(255, r + brightness));
			g = Math.max(0, Math.min(255, g + brightness));
			b = Math.max(0, Math.min(255, b + brightness));
			
			// Ajuster le contraste
			const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
			r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
			g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
			b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
			
			data[i] = r;
			data[i + 1] = g;
			data[i + 2] = b;
		}
		
		return imageData;
	}

	function processImage() {
		if (!currentImage) return;
		
		// Ici vous pouvez ajouter la logique de traitement d'image
		// pour améliorer la numérisation du négatif
		console.log('Traitement de l\'image...');
	}

	function deleteImage(index: number) {
		capturedImages = capturedImages.filter((_, i) => i !== index);
		if (currentImage === capturedImages[index]) {
			currentImage = capturedImages[0] || null;
		}
	}

	function clearAll() {
		capturedImages = [];
		currentImage = null;
	}
</script>

<div class="numerise-container">
	<!-- Zone de prévisualisation vidéo -->
	<div class="video-section">
		<Camera
			bind:this={cameraComponent}
			width={640}
			height={480}
			facingMode="environment"
			onCameraReady={handleCameraReady}
			onError={handleCameraError}
		>
			{#if hasPermission && videoElement}
				<div class="video-container" class:capturing={isCapturing}>
					<video
						bind:this={videoElement}
						autoplay
						muted
						playsinline
						class="camera-preview"
						class:grayscale={isGrayscale}
						class:inverted={isInverted}
						style="filter: brightness({100 + brightness}%) contrast({contrast}%);"
					></video>
					<!-- Overlay de capture -->
					<div class="capture-overlay">
						<div class="capture-frame"></div>
						<div class="capture-guide">
							<div class="guide-line horizontal top"></div>
							<div class="guide-line horizontal bottom"></div>
							<div class="guide-line vertical left"></div>
							<div class="guide-line vertical right"></div>
						</div>
					</div>
				</div>
			{/if}
		</Camera>
	</div>

	<!-- Contrôles de capture -->
	<div class="controls-section">
		{#if hasPermission}
			<div class="capture-controls">
				<MobileButton
					variant="primary"
					size="lg"
					on:click={captureImage}
					class="capture-button"
				>
					📸 Capturer
				</MobileButton>
			</div>
			
			<!-- Contrôles de traitement des négatifs -->
			<div class="negative-controls">
				<div class="control-group">
					<label class="control-label">
						<input type="checkbox" bind:checked={isGrayscale} />
						<span>Niveau de gris</span>
					</label>
					<label class="control-label">
						<input type="checkbox" bind:checked={isInverted} />
						<span>Inverser (négatif → positif)</span>
					</label>
				</div>
				
				<div class="slider-group">
					<div class="slider-control">
						<label for="brightness-slider">Luminosité: {brightness}</label>
						<input 
							id="brightness-slider"
							type="range" 
							min="-100" 
							max="100" 
							bind:value={brightness}
							class="slider"
						/>
					</div>
					
					<div class="slider-control">
						<label for="contrast-slider">Contraste: {contrast}%</label>
						<input 
							id="contrast-slider"
							type="range" 
							min="0" 
							max="200" 
							bind:value={contrast}
							class="slider"
						/>
					</div>
				</div>
				
				<div class="preview-controls">
					<MobileButton 
						variant="outline" 
						size="sm" 
						on:click={() => showPreview = !showPreview}
					>
						{showPreview ? 'Masquer' : 'Aperçu'} en temps réel
					</MobileButton>
				</div>
			</div>
		{/if}
	</div>

	<!-- Galerie des images capturées -->
	{#if capturedImages.length > 0}
		<div class="gallery-section">
			<div class="gallery-header">
				<h3>Images capturées ({capturedImages.length})</h3>
				<MobileButton variant="ghost" size="sm" on:click={clearAll}>
					Effacer tout
				</MobileButton>
			</div>
			
			<div class="gallery-grid">
				{#each capturedImages as image, index}
					<div class="gallery-item" class:active={currentImage === image}>
						<img src={image} alt="Négatif {index + 1}" />
						<div class="gallery-actions">
							<MobileButton 
								variant="ghost" 
								size="sm" 
								on:click={() => currentImage = image}
							>
								👁️
							</MobileButton>
							<MobileButton 
								variant="danger" 
								size="sm" 
								on:click={() => deleteImage(index)}
							>
								🗑️
							</MobileButton>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Aperçu et traitement -->
	{#if currentImage}
		<div class="preview-section">
			<MobileCard title="Aperçu de l'image" class="preview-card">
				<div class="image-preview">
					<img src={currentImage} alt="Aperçu" />
				</div>
				<div class="preview-actions">
					<MobileButton variant="primary" on:click={processImage}>
						🔧 Traiter l'image
					</MobileButton>
					<MobileButton variant="outline" on:click={() => {
						if (currentImage) {
							const link = document.createElement('a');
							link.download = `negatif-${Date.now()}.jpg`;
							link.href = currentImage;
							link.click();
						}
					}}>
						💾 Télécharger
					</MobileButton>
				</div>
			</MobileCard>
		</div>
	{/if}
</div>

<style>
	.numerise-container {
		min-height: 100vh;
		background: #f8fafc;
		display: flex;
		flex-direction: column;
	}

	.video-section {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.video-container {
		position: relative;
		width: 100%;
		max-width: 400px;
		aspect-ratio: 4/3;
		border-radius: 1rem;
		overflow: hidden;
		background: #000;
		transition: all 0.3s ease;
	}

	.video-container.capturing {
		background: white;
		animation: flash 0.2s ease;
	}

	@keyframes flash {
		0%, 100% { background: #000; }
		50% { background: white; }
	}

	.camera-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: filter 0.3s ease;
	}
	
	.camera-preview.grayscale {
		filter: grayscale(100%);
	}
	
	.camera-preview.inverted {
		filter: invert(100%);
	}
	
	.camera-preview.grayscale.inverted {
		filter: grayscale(100%) invert(100%);
	}

	.capture-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.capture-frame {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 80%;
		height: 60%;
		border: 2px solid rgba(59, 130, 246, 0.8);
		border-radius: 0.5rem;
		background: rgba(59, 130, 246, 0.1);
	}

	.capture-guide {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.guide-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.5);
	}

	.guide-line.horizontal {
		left: 0;
		right: 0;
		height: 1px;
	}

	.guide-line.horizontal.top {
		top: 33%;
	}

	.guide-line.horizontal.bottom {
		top: 66%;
	}

	.guide-line.vertical {
		top: 0;
		bottom: 0;
		width: 1px;
	}

	.guide-line.vertical.left {
		left: 33%;
	}

	.guide-line.vertical.right {
		left: 66%;
	}


	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.controls-section {
		padding: 1rem 1.5rem;
		background: white;
		border-top: 1px solid #e5e7eb;
	}

	.capture-controls {
		display: flex;
		justify-content: center;
	}

	:global(.capture-button) {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		font-size: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.negative-controls {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.control-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
	}

	.control-label input[type="checkbox"] {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: #3b82f6;
	}

	.slider-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.slider-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.slider-control label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.slider {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: #e5e7eb;
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #3b82f6;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.preview-controls {
		display: flex;
		justify-content: center;
	}

	.gallery-section {
		padding: 1rem 1.5rem;
		background: white;
		border-top: 1px solid #e5e7eb;
	}

	.gallery-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.gallery-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 1rem;
	}

	.gallery-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.gallery-item.active {
		border-color: #3b82f6;
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.gallery-actions {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.gallery-item:hover .gallery-actions {
		opacity: 1;
	}

	.preview-section {
		padding: 1rem 1.5rem 2rem;
	}

	:global(.preview-card) {
		text-align: center;
	}

	.image-preview {
		margin-bottom: 1rem;
	}

	.image-preview img {
		width: 100%;
		max-width: 300px;
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.preview-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.video-container {
			max-width: 500px;
		}
		
		.gallery-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
