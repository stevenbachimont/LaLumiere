<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';

	// États de l'application
	let isMeasuring = $state(false);
	let stream: MediaStream | null = null;
	let videoElement: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D;
	
	// Données de mesure
	let currentBrightness = $state(0);
	let evValue = $state(0);
	let recommendedSettings = $state({
		aperture: 'f/8',
		shutterSpeed: '1/125',
		iso: 400
	});

	// Réglages modifiables
	let manualSettings = $state({
		aperture: 'f/8',
		shutterSpeed: '1/125',
		iso: 400
	});

	// États de verrouillage
	let lockedSettings = $state({
		aperture: false,
		shutterSpeed: false,
		iso: false
	});

	// Mode automatique/manuel
	let isAutoMode = $state(true);

	// Valeurs possibles pour chaque réglage
	const apertureValues = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16', 'f/22'];
	const shutterSpeedValues = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1s', '2s', '4s'];
	const isoValues = [50, 100, 200, 400, 800, 1600, 3200, 6400];

	onMount(async () => {
		console.log('WorkingLightMeter: onMount');
		// Attendre que les éléments DOM soient liés
		await new Promise(resolve => setTimeout(resolve, 100));
		await requestCameraPermission();
	});

	onDestroy(() => {
		stopCamera();
	});

	async function requestCameraPermission() {
		try {
			console.log('WorkingLightMeter: Demande d\'accès à la caméra');
			stream = await navigator.mediaDevices.getUserMedia({ 
				video: { 
					width: { ideal: 640 },
					height: { ideal: 480 }
				} 
			});
			
			if (videoElement && canvas) {
				videoElement.srcObject = stream;
				videoElement.addEventListener('loadedmetadata', () => {
					console.log('WorkingLightMeter: Vidéo chargée');
					initializeCanvas();
					startMeasuring();
				});
			} else {
				console.error('WorkingLightMeter: Éléments vidéo/canvas non trouvés');
				console.log('videoElement:', videoElement);
				console.log('canvas:', canvas);
			}
		} catch (error) {
			console.error('WorkingLightMeter: Erreur d\'accès à la caméra:', error);
		}
	}

	function initializeCanvas() {
		if (canvas && videoElement) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				context = ctx;
				(context as any).willReadFrequently = true;
				canvas.width = videoElement.videoWidth || 640;
				canvas.height = videoElement.videoHeight || 480;
				console.log('WorkingLightMeter: Canvas initialisé');
			} else {
				console.error('WorkingLightMeter: Impossible d\'obtenir le contexte 2D');
			}
		} else {
			console.error('WorkingLightMeter: Canvas ou vidéo non trouvés');
		}
	}

	function startMeasuring() {
		console.log('WorkingLightMeter: Démarrage de la mesure');
		isMeasuring = true;
		measureBrightness();
	}

	function stopMeasuring() {
		console.log('WorkingLightMeter: Arrêt de la mesure');
		isMeasuring = false;
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}

	function measureBrightness() {
		if (!isMeasuring) {
			return;
		}

		// Vérifier que tous les éléments sont disponibles
		if (!videoElement || !canvas || !context) {
			console.log('WorkingLightMeter: Éléments non prêts, nouvelle tentative...');
			if (isMeasuring) {
				requestAnimationFrame(measureBrightness);
			}
			return;
		}

		// Vérifier que la vidéo est prête
		if (videoElement.readyState < 2) {
			if (isMeasuring) {
				requestAnimationFrame(measureBrightness);
			}
			return;
		}

		try {
			// Dessiner la frame vidéo sur le canvas
			context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
			
			// Obtenir les données d'image
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;
			
			// Calculer la luminosité moyenne
			let totalBrightness = 0;
			for (let i = 0; i < data.length; i += 4) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
				totalBrightness += luminance;
			}
			
			currentBrightness = Math.round(totalBrightness / (data.length / 4));
			
			// Calculer l'EV (Exposure Value) basé sur la luminosité
			// EV = log2(L * S / K) où L = luminance, S = ISO, K = constante (12.5)
			// Convertir la luminosité (0-255) en luminance approximative (cd/m²)
			const luminance = (currentBrightness / 255) * 1000; // 0-1000 cd/m²
			const iso = manualSettings.iso;
			const k = 12.5; // Constante d'étalonnage du posemètre
			
			evValue = Math.round(Math.log2((luminance * iso) / k));
			
			// Calculer les réglages recommandés
			calculateRecommendedSettings();
			
		} catch (error) {
			console.error('WorkingLightMeter: Erreur lors de la mesure:', error);
		}
		
		// Continuer la mesure
		if (isMeasuring) {
			requestAnimationFrame(measureBrightness);
		}
	}

	function calculateRecommendedSettings() {
		// Calculer les réglages basés sur l'EV réel
		// Utiliser la règle de f/16 comme référence (EV 15 = f/16, 1/100s, ISO 100)
		const targetEV = evValue;
		const baseISO = 100;
		const baseAperture = 16; // f/16
		const baseShutterSpeed = 100; // 1/100s
		
		// Calculer l'ISO nécessaire pour l'EV cible
		const isoEV = targetEV - 15; // Différence par rapport à EV 15
		const requiredISO = Math.max(50, Math.min(6400, baseISO * Math.pow(2, isoEV)));
		
		// Trouver l'ISO le plus proche dans notre liste
		const availableISOs = [50, 100, 200, 400, 800, 1600, 3200, 6400];
		const iso = availableISOs.reduce((prev, curr) => 
			Math.abs(curr - requiredISO) < Math.abs(prev - requiredISO) ? curr : prev
		);
		
		// Ajuster l'EV pour l'ISO choisi
		const adjustedEV = targetEV - Math.log2(iso / baseISO);
		
		// Calculer l'ouverture et la vitesse pour l'EV ajusté
		// IL = log2(N²/t) donc N²/t = 2^IL
		const n2OverT = Math.pow(2, adjustedEV);
		
		// Choisir une ouverture raisonnable et calculer la vitesse
		let aperture, shutterSpeed;
		
		if (adjustedEV <= 8) {
			// Très sombre - grande ouverture
			aperture = 'f/1.4';
			const t = Math.pow(1.4, 2) / n2OverT;
			shutterSpeed = findClosestShutterSpeed(t);
		} else if (adjustedEV <= 12) {
			// Sombre - ouverture moyenne
			aperture = 'f/2.8';
			const t = Math.pow(2.8, 2) / n2OverT;
			shutterSpeed = findClosestShutterSpeed(t);
		} else if (adjustedEV <= 16) {
			// Normal - ouverture standard
			aperture = 'f/5.6';
			const t = Math.pow(5.6, 2) / n2OverT;
			shutterSpeed = findClosestShutterSpeed(t);
		} else if (adjustedEV <= 20) {
			// Lumineux - petite ouverture
			aperture = 'f/11';
			const t = Math.pow(11, 2) / n2OverT;
			shutterSpeed = findClosestShutterSpeed(t);
		} else {
			// Très lumineux - très petite ouverture
			aperture = 'f/16';
			const t = Math.pow(16, 2) / n2OverT;
			shutterSpeed = findClosestShutterSpeed(t);
		}

		recommendedSettings = { aperture, shutterSpeed, iso };
		
		// Mettre à jour les réglages manuels seulement en mode automatique et s'ils ne sont pas verrouillés
		if (isAutoMode) {
			if (!lockedSettings.aperture) {
				manualSettings = { ...manualSettings, aperture };
			}
			
			if (!lockedSettings.shutterSpeed) {
				manualSettings = { ...manualSettings, shutterSpeed };
			}
			
			if (!lockedSettings.iso) {
				manualSettings = { ...manualSettings, iso };
			}
		}
	}

	function toggleLock(setting: 'aperture' | 'shutterSpeed' | 'iso') {
		lockedSettings = { ...lockedSettings, [setting]: !lockedSettings[setting] };
		console.log(`WorkingLightMeter: ${setting} ${lockedSettings[setting] ? 'verrouillé' : 'déverrouillé'}`);
	}

	function changeAperture(newAperture: string) {
		if (!lockedSettings.aperture) {
			manualSettings = { ...manualSettings, aperture: newAperture };
			console.log(`WorkingLightMeter: Changement ouverture vers ${newAperture}`);
		}
	}

	function changeShutterSpeed(newSpeed: string) {
		if (!lockedSettings.shutterSpeed) {
			manualSettings = { ...manualSettings, shutterSpeed: newSpeed };
			console.log(`WorkingLightMeter: Changement vitesse vers ${newSpeed}`);
		}
	}

	function changeISO(newISO: number) {
		if (!lockedSettings.iso) {
			manualSettings = { ...manualSettings, iso: newISO };
			console.log(`WorkingLightMeter: Changement ISO vers ${newISO}`);
		}
	}

	function findClosestShutterSpeed(timeInSeconds: number) {
		const shutterSpeedValues = [
			{ value: '1/4000', time: 1/4000 },
			{ value: '1/2000', time: 1/2000 },
			{ value: '1/1000', time: 1/1000 },
			{ value: '1/500', time: 1/500 },
			{ value: '1/250', time: 1/250 },
			{ value: '1/125', time: 1/125 },
			{ value: '1/60', time: 1/60 },
			{ value: '1/30', time: 1/30 },
			{ value: '1/15', time: 1/15 },
			{ value: '1/8', time: 1/8 },
			{ value: '1/4', time: 1/4 },
			{ value: '1/2', time: 1/2 },
			{ value: '1s', time: 1 },
			{ value: '2s', time: 2 },
			{ value: '4s', time: 4 }
		];
		
		return shutterSpeedValues.reduce((prev, curr) => 
			Math.abs(curr.time - timeInSeconds) < Math.abs(prev.time - timeInSeconds) ? curr : prev
		).value;
	}

	function getEVDescription(ev: number) {
		if (ev >= 16) return "Soleil sur neige";
		if (ev >= 15) return "Soleil brillant";
		if (ev >= 14) return "Soleil voilé";
		if (ev >= 13) return "Clair nuageux";
		if (ev >= 12) return "Très nuageux";
		if (ev >= 11) return "Soleil couchant";
		if (ev >= 8) return "Ville éclairée";
		if (ev >= 6) return "Concert/spectacle";
		if (ev >= 4) return "Éclairage domestique";
		if (ev >= 3) return "Ville la nuit";
		if (ev >= -3) return "Pleine lune";
		return "Nuit noire";
	}
</script>

<div class="light-meter-container">
	<!-- Caméra cachée -->
	<video bind:this={videoElement} id="light-meter-video" autoplay muted playsinline style="display: none;"></video>
	<canvas bind:this={canvas} id="light-meter-canvas" style="display: none;"></canvas>

	<!-- Interface utilisateur -->
	<div class="measurement-status">
		<div class="status-indicator">
			<div class="status-dot" class:active={isMeasuring}></div>
			<span>{isMeasuring ? 'Mesure active' : 'Initialisation...'}</span>
		</div>
	</div>

	<!-- Affichage des résultats -->
	<div class="results-section">
		<MobileCard title="Mesure de lumière">
			<div class="measurement-display">
				<div class="brightness-info">
					<div class="brightness-value">{currentBrightness}</div>
					<div class="brightness-label">Luminosité</div>
				</div>
				<div class="ev-info">
					<div class="ev-value">EV {evValue}</div>
					<div class="ev-label">{getEVDescription(evValue)}</div>
				</div>
			</div>
		</MobileCard>

		<!-- Bouton de basculement mode automatique/manuel -->
		<div class="mode-toggle">
			<MobileButton 
				variant={isAutoMode ? "primary" : "secondary"} 
				size="sm" 
				onclick={() => isAutoMode = !isAutoMode}
			>
				{isAutoMode ? 'Mode Auto' : 'Mode Manuel'}
			</MobileButton>
			<div class="mode-description">
				{isAutoMode ? 'Les réglages s\'ajustent automatiquement' : 'Ajustez les réglages manuellement'}
			</div>
		</div>

		<!-- Réglages recommandés -->
		<MobileCard title="Réglages recommandés">
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

		<!-- Réglages manuels -->
		<MobileCard title="Réglages manuels">
			<div class="manual-settings">
				<div class="setting-row">
					<div class="setting-label">Ouverture</div>
					<select 
						value={manualSettings.aperture} 
						onchange={(e) => changeAperture((e.target as HTMLSelectElement).value)}
						disabled={lockedSettings.aperture}
					>
						{#each apertureValues as aperture}
							<option value={aperture}>{aperture}</option>
						{/each}
					</select>
					<button 
						class="lock-button" 
						class:locked={lockedSettings.aperture}
						onclick={() => toggleLock('aperture')}
					>
						{lockedSettings.aperture ? '🔒' : '🔓'}
					</button>
				</div>

				<div class="setting-row">
					<div class="setting-label">Vitesse</div>
					<select 
						value={manualSettings.shutterSpeed} 
						onchange={(e) => changeShutterSpeed((e.target as HTMLSelectElement).value)}
						disabled={lockedSettings.shutterSpeed}
					>
						{#each shutterSpeedValues as speed}
							<option value={speed}>{speed}</option>
						{/each}
					</select>
					<button 
						class="lock-button" 
						class:locked={lockedSettings.shutterSpeed}
						onclick={() => toggleLock('shutterSpeed')}
					>
						{lockedSettings.shutterSpeed ? '🔒' : '🔓'}
					</button>
				</div>

				<div class="setting-row">
					<div class="setting-label">ISO</div>
					<select 
						value={manualSettings.iso} 
						onchange={(e) => changeISO(parseInt((e.target as HTMLSelectElement).value))}
						disabled={lockedSettings.iso}
					>
						{#each isoValues as iso}
							<option value={iso}>{iso}</option>
						{/each}
					</select>
					<button 
						class="lock-button" 
						class:locked={lockedSettings.iso}
						onclick={() => toggleLock('iso')}
					>
						{lockedSettings.iso ? '🔒' : '🔓'}
					</button>
				</div>
			</div>
		</MobileCard>
	</div>
</div>

<style>
	.light-meter-container {
		padding: 1rem;
		background: #f8fafc;
		min-height: 100vh;
	}

	.measurement-status {
		background: white;
		padding: 1rem 1.5rem;
		border-radius: 12px;
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ef4444;
		transition: all 0.3s ease;
	}

	.status-dot.active {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.measurement-display {
		display: flex;
		justify-content: space-around;
		text-align: center;
	}

	.brightness-info, .ev-info {
		flex: 1;
	}

	.brightness-value, .ev-value {
		font-size: 2rem;
		font-weight: bold;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.brightness-label, .ev-label {
		font-size: 0.875rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.mode-toggle {
		background: white;
		padding: 1rem 1.5rem;
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.mode-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		text-align: center;
	}

	.setting-item {
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 8px;
	}

	.setting-label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.setting-value {
		font-size: 1.25rem;
		font-weight: bold;
		color: #1f2937;
	}

	.manual-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 8px;
	}

	.setting-row .setting-label {
		min-width: 80px;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.setting-row select {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		font-size: 1rem;
	}

	.setting-row select:disabled {
		background: #f3f4f6;
		color: #9ca3af;
	}

	.lock-button {
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.2s ease;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lock-button:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.1);
	}

	.lock-button.locked {
		color: #ef4444;
	}

	.lock-button:not(.locked) {
		color: #10b981;
	}
</style>
