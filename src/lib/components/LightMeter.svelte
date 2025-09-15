<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';

	// États de l'application
	let isMeasuring = false;
	let hasPermission = false;
	let stream: MediaStream | null = null;
	let videoElement: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D;

	// Données de mesure
	let currentBrightness = 0;
	let recommendedSettings = {
		aperture: 'f/8',
		shutterSpeed: '1/125',
		iso: 400
	};

	// Configuration de l'appareil photo
	let selectedCamera = '';
	let availableCameras: MediaDeviceInfo[] = [];

	onMount(async () => {
		await getAvailableCameras();
		// Attendre que l'élément vidéo soit monté avant de demander l'accès
		await tick();
		await requestCameraPermission();
	});

	onDestroy(() => {
		stopCamera();
	});

	async function getAvailableCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter(device => device.kind === 'videoinput');
			if (availableCameras.length > 0) {
				selectedCamera = availableCameras[0].deviceId;
			}
		} catch (error) {
			console.error('Erreur lors de la récupération des caméras:', error);
		}
	}

	async function requestCameraPermission() {
		try {
			// Récupérer l'élément vidéo depuis le DOM
			const videoEl = document.querySelector('.camera-preview') as HTMLVideoElement;
			if (!videoEl) {
				console.log('Élément vidéo pas encore disponible, nouvelle tentative...');
				setTimeout(requestCameraPermission, 200);
				return;
			}
			
			// Mettre à jour la référence
			videoElement = videoEl;

			const constraints = {
				video: {
					deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;
			hasPermission = true;
			
			// Attendre que la vidéo soit prête
			videoElement.addEventListener('loadedmetadata', () => {
				// Récupérer le canvas depuis le DOM
				const canvasEl = document.querySelector('.measurement-canvas') as HTMLCanvasElement;
				if (canvasEl) {
					canvas = canvasEl;
					const ctx = canvas.getContext('2d');
					if (ctx) {
						context = ctx;
						canvas.width = videoElement.videoWidth || 640;
						canvas.height = videoElement.videoHeight || 480;
						
						// Démarrer automatiquement la mesure
						setTimeout(() => {
							startMeasuring();
						}, 1000);
					}
				}
			});
			
			// Démarrer aussi la mesure après un délai de sécurité
			setTimeout(() => {
				if (hasPermission && !isMeasuring) {
					startMeasuring();
				}
			}, 2000);
		} catch (error) {
			console.error('Erreur d\'accès à la caméra:', error);
			hasPermission = false;
		}
	}

	function startMeasuring() {
		if (!hasPermission || !stream) return;
		
		// S'assurer que le canvas est initialisé
		if (!canvas || !context) {
			const canvasEl = document.querySelector('.measurement-canvas') as HTMLCanvasElement;
			if (canvasEl) {
				canvas = canvasEl;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					context = ctx;
					canvas.width = videoElement.videoWidth || 640;
					canvas.height = videoElement.videoHeight || 480;
				}
			}
		}
		
		isMeasuring = true;
		measureBrightness();
	}

	function stopMeasuring() {
		isMeasuring = false;
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
		hasPermission = false;
	}

	function measureBrightness() {
		if (!isMeasuring || !videoElement || !canvas || !context) return;

		// Vérifier que la vidéo est prête
		if (videoElement.readyState < 2) {
			if (isMeasuring) {
				requestAnimationFrame(measureBrightness);
			}
			return;
		}

		// Ajuster la taille du canvas si nécessaire
		if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
			canvas.width = videoElement.videoWidth || 640;
			canvas.height = videoElement.videoHeight || 480;
		}

		// Dessiner la frame vidéo sur le canvas
		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
		
		// Obtenir les données d'image
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;
		
		// Calculer la luminosité moyenne
		let totalBrightness = 0;
		for (let i = 0; i < data.length; i += 4) {
			// Conversion RGB vers luminance (formule standard)
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
			totalBrightness += luminance;
		}
		
		currentBrightness = Math.round(totalBrightness / (data.length / 4));
		
		// Calculer les réglages recommandés
		calculateRecommendedSettings(currentBrightness);
		
		// Continuer la mesure si activée
		if (isMeasuring) {
			requestAnimationFrame(measureBrightness);
		}
	}

	function calculateRecommendedSettings(brightness: number) {
		// Logique de calcul des réglages basée sur la luminosité
		// Ces valeurs sont approximatives et peuvent être ajustées
		let aperture = 'f/8';
		let shutterSpeed = '1/125';
		let iso = 400;

		if (brightness < 50) {
			// Très sombre
			aperture = 'f/2.8';
			shutterSpeed = '1/30';
			iso = 1600;
		} else if (brightness < 100) {
			// Sombre
			aperture = 'f/4';
			shutterSpeed = '1/60';
			iso = 800;
		} else if (brightness < 150) {
			// Lumière normale
			aperture = 'f/5.6';
			shutterSpeed = '1/125';
			iso = 400;
		} else if (brightness < 200) {
			// Lumineux
			aperture = 'f/8';
			shutterSpeed = '1/250';
			iso = 200;
		} else {
			// Très lumineux
			aperture = 'f/11';
			shutterSpeed = '1/500';
			iso = 100;
		}

		recommendedSettings = { aperture, shutterSpeed, iso };
	}
</script>

<div class="light-meter-container">
	<!-- Zone de prévisualisation vidéo -->
	<div class="video-section">
		<div class="video-container">
			<video
				bind:this={videoElement}
				autoplay
				muted
				playsinline
				class="camera-preview"
			></video>
			<canvas bind:this={canvas} class="measurement-canvas"></canvas>
			
			<!-- Overlay de mesure -->
			<div class="measurement-overlay">
				<div class="center-crosshair"></div>
				<div class="measurement-zone"></div>
			</div>
		</div>
		
		{#if !hasPermission}
			<div class="permission-overlay">
				<div class="permission-content">
					<div class="permission-icon">📷</div>
					<h3>Accès à la caméra requis</h3>
					<p>Autorisez l'accès à votre caméra pour mesurer la lumière</p>
					<MobileButton variant="primary" on:click={requestCameraPermission}>
						Autoriser la caméra
					</MobileButton>
				</div>
			</div>
		{/if}
	</div>

	<!-- Statut de mesure -->
	{#if hasPermission}
		<div class="measurement-status">
			<div class="status-indicator">
				<div class="status-dot" class:active={isMeasuring}></div>
				<span>{isMeasuring ? 'Mesure automatique active' : 'Initialisation...'}</span>
			</div>
		</div>
	{/if}

	<!-- Affichage des résultats -->
	<div class="results-section">
		<MobileCard title="Luminosité actuelle" class="measurement-card">
			<div class="brightness-display">
				<div class="brightness-value">{currentBrightness}</div>
				<div class="brightness-bar">
					<div 
						class="brightness-fill" 
						style="width: {Math.min((currentBrightness / 255) * 100, 100)}%"
					></div>
				</div>
				<div class="brightness-label">sur 255</div>
			</div>
		</MobileCard>

		<MobileCard title="Réglages recommandés" class="settings-card">
			<div class="settings-grid">
				<div class="setting-item">
					<div class="setting-label">Ouverture</div>
					<div class="setting-value">{recommendedSettings.aperture}</div>
				</div>
				<div class="setting-item">
					<div class="setting-label">Vitesse</div>
					<div class="setting-value">{recommendedSettings.shutterSpeed}</div>
				</div>
				<div class="setting-item">
					<div class="setting-label">ISO</div>
					<div class="setting-value">{recommendedSettings.iso}</div>
				</div>
			</div>
		</MobileCard>
	</div>
</div>

<style>
	.light-meter-container {
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
	}

	.camera-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.measurement-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
	}

	.measurement-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.center-crosshair {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.8);
		border-radius: 50%;
	}

	.center-crosshair::before,
	.center-crosshair::after {
		content: '';
		position: absolute;
		background: rgba(255, 255, 255, 0.8);
	}

	.center-crosshair::before {
		top: 50%;
		left: 2px;
		right: 2px;
		height: 2px;
		transform: translateY(-50%);
	}

	.center-crosshair::after {
		left: 50%;
		top: 2px;
		bottom: 2px;
		width: 2px;
		transform: translateX(-50%);
	}

	.measurement-zone {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 60px;
		height: 60px;
		border: 1px solid rgba(59, 130, 246, 0.6);
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.1);
	}

	.permission-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
	}

	.permission-content {
		text-align: center;
		padding: 2rem;
		background: white;
		border-radius: 1rem;
		margin: 1rem;
		max-width: 300px;
	}

	.permission-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.permission-content h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.permission-content p {
		color: #6b7280;
		margin: 0 0 2rem 0;
	}

	.controls-section {
		padding: 1rem 1.5rem;
		background: white;
		border-top: 1px solid #e5e7eb;
	}

	.measurement-status {
		display: flex;
		justify-content: center;
		padding: 1rem 1.5rem;
		background: white;
		border-top: 1px solid #e5e7eb;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #ef4444;
		transition: background-color 0.3s ease;
	}

	.status-dot.active {
		background-color: #10b981;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.results-section {
		padding: 1rem 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.measurement-card {
		text-align: center;
	}

	.brightness-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.brightness-value {
		font-size: 3rem;
		font-weight: 700;
		color: #3b82f6;
		line-height: 1;
	}

	.brightness-bar {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}

	.brightness-fill {
		height: 100%;
		background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
		transition: width 0.3s ease;
	}

	.brightness-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.setting-item {
		text-align: center;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 0.75rem;
	}

	.setting-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.setting-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.video-container {
			max-width: 500px;
		}
		
		.settings-grid {
			gap: 1.5rem;
		}
	}
</style>
