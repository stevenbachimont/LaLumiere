<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Props
	export let width = 640;
	export let height = 480;
	export let facingMode: 'user' | 'environment' = 'environment';
	export let autoplay = true;
	export let muted = true;
	export let playsinline = true;

	// États
	let stream: MediaStream | null = null;
	let localVideoElement: HTMLVideoElement;
	let localCanvas: HTMLCanvasElement;
	let localContext: CanvasRenderingContext2D;

	// Événements
	export let onCameraReady: (() => void) | undefined = undefined;
	export let onError: ((error: Error) => void) | undefined = undefined;

	// Exposer les éléments pour usage externe (optionnels)
	export let videoElement: HTMLVideoElement | undefined = undefined;
	export let canvas: HTMLCanvasElement | undefined = undefined;
	export let context: CanvasRenderingContext2D | undefined = undefined;
	export let hasPermission: boolean = false;

	onMount(async () => {
		try {
			// Demander l'accès à la caméra (même code que SimpleWorkingMeter)
			stream = await navigator.mediaDevices.getUserMedia({ 
				video: { 
					facingMode,
					width: { ideal: width },
					height: { ideal: height }
				} 
			});
			
			// Attendre que les éléments soient prêts
			await new Promise(resolve => setTimeout(resolve, 200));
			
			// Configurer la vidéo
			if (localVideoElement) {
				localVideoElement.srcObject = stream;
				localVideoElement.play();
			}
			
			// Configurer le canvas
			if (localCanvas) {
				localCanvas.width = width;
				localCanvas.height = height;
				localContext = localCanvas.getContext('2d')!;
			}
			
			// Assigner les références locales aux props exportées
			videoElement = localVideoElement;
			canvas = localCanvas;
			context = localContext;
			
			hasPermission = true;
			
			// Notifier que la caméra est prête
			if (onCameraReady) {
				onCameraReady();
			}
			
		} catch (error) {
			console.error('Erreur caméra:', error);
			hasPermission = false;
			
			// Notifier l'erreur
			if (onError) {
				onError(error as Error);
			}
		}
	});

	onDestroy(() => {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
		}
	});

	// Fonction pour capturer une image
	export function captureImage(): string | null {
		if (!localVideoElement || !localCanvas || !localContext) return null;

		// Dessiner la frame vidéo sur le canvas
		localContext.drawImage(localVideoElement, 0, 0, localCanvas.width, localCanvas.height);
		
		// Convertir en image
		return localCanvas.toDataURL('image/jpeg', 0.9);
	}

	// Fonction pour traiter l'image (négatifs, etc.)
	export function processImage(processor: (imageData: ImageData) => ImageData): string | null {
		if (!localVideoElement || !localCanvas || !localContext) return null;

		// Dessiner la frame vidéo sur le canvas
		localContext.drawImage(localVideoElement, 0, 0, localCanvas.width, localCanvas.height);
		
		// Obtenir les données d'image
		const imageData = localContext.getImageData(0, 0, localCanvas.width, localCanvas.height);
		
		// Appliquer le traitement
		const processedData = processor(imageData);
		
		// Remettre les données traitées sur le canvas
		localContext.putImageData(processedData, 0, 0);
		
		// Convertir en image
		return localCanvas.toDataURL('image/jpeg', 0.9);
	}

</script>

<div class="camera-container">
	<video
		bind:this={localVideoElement}
		{autoplay}
		{muted}
		{playsinline}
		class="camera-video"
		style:opacity={hasPermission ? 1 : 0}
	></video>
	<canvas bind:this={localCanvas} class="camera-canvas"></canvas>
	
	{#if hasPermission}
		<slot {videoElement} />
	{:else}
		<div class="camera-loading">
			<div class="loading-spinner"></div>
			<p>Initialisation de la caméra...</p>
		</div>
	{/if}
</div>

<style>
	.camera-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #000;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.camera-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
	}

	.camera-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: white;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
