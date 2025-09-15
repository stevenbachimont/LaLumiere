<script lang="ts">
	import { onMount } from 'svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';

	// États de l'application
	let isCapturing = false;
	let hasPermission = false;
	let stream: MediaStream | null = null;
	let videoElement: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D;

	// Images capturées
	let capturedImages: string[] = [];
	let currentImage: string | null = null;

	onMount(async () => {
		await requestCameraPermission();
	});

	async function requestCameraPermission() {
		try {
			const constraints = {
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;
			hasPermission = true;
			
			// Initialiser le canvas
			videoElement.addEventListener('loadedmetadata', () => {
				if (canvas) {
					const ctx = canvas.getContext('2d');
					if (ctx) {
						context = ctx;
						canvas.width = videoElement.videoWidth || 640;
						canvas.height = videoElement.videoHeight || 480;
					}
				}
			});
		} catch (error) {
			console.error('Erreur d\'accès à la caméra:', error);
			hasPermission = false;
		}
	}

	function captureImage() {
		if (!videoElement || !canvas || !context) return;

		// Dessiner la frame vidéo sur le canvas
		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
		
		// Convertir en image
		const imageData = canvas.toDataURL('image/jpeg', 0.8);
		capturedImages = [...capturedImages, imageData];
		currentImage = imageData;
		
		// Effet de flash
		isCapturing = true;
		setTimeout(() => {
			isCapturing = false;
		}, 200);
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
		{#if hasPermission}
			<div class="video-container" class:capturing={isCapturing}>
				<video
					bind:this={videoElement}
					autoplay
					muted
					playsinline
					class="camera-preview"
				></video>
				<canvas bind:this={canvas} class="capture-canvas"></canvas>
				
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
		{:else}
			<div class="permission-request">
				<div class="permission-icon">📷</div>
				<h3>Accès à la caméra requis</h3>
				<p>Autorisez l'accès à votre caméra pour numériser vos négatifs</p>
				<MobileButton variant="primary" on:click={requestCameraPermission}>
					Autoriser la caméra
				</MobileButton>
			</div>
		{/if}
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
	}

	.capture-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
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

	.permission-request {
		text-align: center;
		padding: 2rem;
	}

	.permission-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.permission-request h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.permission-request p {
		color: #6b7280;
		margin: 0 0 2rem 0;
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

	.capture-button {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		font-size: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

	.preview-card {
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
