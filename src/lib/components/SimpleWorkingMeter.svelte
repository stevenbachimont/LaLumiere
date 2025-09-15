<script lang="ts">
	import Camera from './Camera.svelte';

	// États
	let isMeasuring = $state(false);
	let isLocked = $state(false);
	let currentBrightness = $state(0);
	let luxValue = $state(0);
	let evValue = $state(0);
	let cameraComponent: Camera;
	let videoElement = $state<HTMLVideoElement | undefined>(undefined);
	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let context = $state<CanvasRenderingContext2D | undefined>(undefined);
	let hasPermission = $state(false);

	// Réglages
	let aperture = $state('f/8');
	let shutterSpeed = $state('1/125');
	let iso = $state(400);
	
	// Valeurs ISO disponibles
	const isoValues = [100, 200, 400, 800, 1600, 3200, 6400];
	
	// Valeurs d'ouverture disponibles
	const apertureValues = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
	
	// Valeurs de vitesse disponibles
	const shutterSpeedValues = [1, 2, 4, 8, 15, 30, 60, 125, 250, 500, 1000, 2000, 4000];

	function handleCameraReady() {
		// Démarrer la mesure quand la caméra est prête
		isMeasuring = true;
		measure();
	}

	function handleCameraError(error: Error) {
		console.error('Erreur d\'accès à la caméra:', error);
	}

	function measure() {
		if (!isMeasuring || !cameraComponent) return;

		try {
			// Utiliser le composant Camera pour capturer l'image
			const imageData = cameraComponent.captureImage();
			if (!imageData) return;
			
			// Créer un canvas temporaire pour analyser l'image
			const tempCanvas = document.createElement('canvas');
			const tempCtx = tempCanvas.getContext('2d');
			if (!tempCtx) return;
			
			// Charger l'image capturée
			const img = new Image();
			img.onload = () => {
				tempCanvas.width = img.width;
				tempCanvas.height = img.height;
				tempCtx.drawImage(img, 0, 0);
				
				// Obtenir les données d'image
				const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
				const data = imageData.data;
				
				// Convertir en noir et blanc et calculer la luminosité moyenne
				let total = 0;
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];
					
					// Conversion en niveaux de gris avec pondération luminance
					// Formule standard : 0.299*R + 0.587*G + 0.114*B
					const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
					
					total += gray;
				}
				
				currentBrightness = Math.round(total / (data.length / 4));
				
				// Mettre à jour seulement si la mesure n'est pas bloquée
				if (!isLocked) {
					// Calculer l'EV directement à partir de la luminosité de la caméra
					// Approche simplifiée basée sur des tables de référence
					evValue = calculateEVFromBrightness(currentBrightness, iso);
					
					// Calculer le lux approximatif pour l'affichage
					luxValue = calculateLuxFromEV(evValue, iso);
					
					console.log(`Mesure: luminance=${currentBrightness}, lux=${luxValue.toFixed(0)}, ISO=${iso}, EV=${evValue}`);
					
					// Calculer les réglages
					calculateSettings();
				}
			};
			img.src = imageData;
			
		} catch (error) {
			console.error('Erreur mesure:', error);
		}
		
		// Continuer la mesure
		if (isMeasuring) {
			requestAnimationFrame(measure);
		}
	}

	// Calcul direct de l'EV à partir de la luminosité de la caméra
	// Basé sur des tables de référence simples et réalistes
	function calculateEVFromBrightness(brightness: number, iso: number): number {
		// Table de référence EV basée sur la luminosité (0-255)
		// Ces valeurs sont calibrées pour donner des résultats réalistes
		let baseEV;
		
		if (brightness <= 5) {
			baseEV = -2; // Très très sombre
		} else if (brightness <= 15) {
			baseEV = -1; // Très sombre
		} else if (brightness <= 30) {
			baseEV = 0; // Sombre
		} else if (brightness <= 50) {
			baseEV = 2; // Normal sombre
		} else if (brightness <= 80) {
			baseEV = 4; // Normal
		} else if (brightness <= 120) {
			baseEV = 6; // Lumineux
		} else if (brightness <= 160) {
			baseEV = 8; // Très lumineux
		} else if (brightness <= 200) {
			baseEV = 10; // Extérieur ombragé
		} else {
			baseEV = 12; // Extérieur ensoleillé
		}
		
		// Ajuster selon l'ISO (ISO 100 = base, ISO 400 = +2 EV)
		const isoAdjustment = Math.log2(iso / 100);
		const finalEV = baseEV + isoAdjustment;
		
		return Math.round(finalEV);
	}

	// Calcul du lux approximatif à partir de l'EV (pour l'affichage)
	function calculateLuxFromEV(ev: number, iso: number): number {
		// Formule standard : lux = (2^EV) × 2.5
		// Cette formule ne dépend pas de l'ISO pour l'affichage
		return Math.round(Math.pow(2, ev) * 2.5);
	}

	function calculateSettings() {
		// Calcul professionnel des réglages d'exposition
		// Basé sur la formule standard : EV = log2(A² / T) + log2(ISO/100)
		// Réarrangé : T = A² * 100 / (ISO * 2^EV)
		
		console.log(`Calcul réglages: EV=${evValue}, ISO=${iso}, lux=${luxValue.toFixed(1)}`);
		
		// Choisir une ouverture optimale selon l'éclairage
		let apertureValue = selectOptimalAperture(evValue);
		
		// Calculer la vitesse d'obturation selon la formule standard
		const timeInSeconds = calculateShutterSpeed(apertureValue, iso, evValue);
		
		// Convertir en vitesse d'obturation standard
		shutterSpeed = formatShutterSpeed(timeInSeconds);
		
		aperture = `f/${apertureValue}`;
		
		console.log(`Résultat: ${aperture}, ${shutterSpeed} (temps calculé: ${timeInSeconds.toFixed(6)}s)`);
	}

	// Sélection de l'ouverture optimale selon l'EV
	function selectOptimalAperture(ev: number): number {
		// Logique de sélection basée sur les conditions d'éclairage
		if (ev <= 2) {
			return 1.4; // Très sombre - grande ouverture
		} else if (ev <= 6) {
			return 2.8; // Sombre - ouverture moyenne
		} else if (ev <= 10) {
			return 4;   // Normal sombre - ouverture standard
		} else if (ev <= 14) {
			return 5.6; // Normal - ouverture standard
		} else if (ev <= 18) {
			return 8;   // Lumineux - petite ouverture
		} else {
			return 11;  // Très lumineux - très petite ouverture
		}
	}

	// Calcul de la vitesse d'obturation selon la formule standard
	function calculateShutterSpeed(aperture: number, iso: number, ev: number): number {
		// Formule standard : T = A² * 100 / (ISO * 2^EV)
		return (Math.pow(aperture, 2) * 100) / (iso * Math.pow(2, ev));
	}

	// Formatage de la vitesse d'obturation
	function formatShutterSpeed(timeInSeconds: number): string {
		if (timeInSeconds >= 1) {
			return `${Math.round(timeInSeconds)}s`;
		} else {
			const fraction = Math.round(1 / timeInSeconds);
			// Limiter aux valeurs standard
			const standardSpeeds = [1, 2, 4, 8, 15, 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000];
			const closestSpeed = standardSpeeds.reduce((prev, curr) => 
				Math.abs(curr - fraction) < Math.abs(prev - fraction) ? curr : prev
			);
			return `1/${closestSpeed}`;
		}
	}
	
	function updateISO(newISO: number) {
		iso = newISO;
		// L'EV ne change pas, seule l'ouverture et la vitesse s'ajustent
		if (isLocked) {
			// En mode bloqué, recalculer les réglages avec le nouvel ISO
			calculateSettings();
		} else {
			calculateSettings();
		}
	}
	
	function toggleLock() {
		isLocked = !isLocked;
		if (!isLocked) {
			// Si on débloque, recalculer avec les valeurs actuelles
			// Utiliser la même logique que dans measure()
			evValue = calculateEVFromBrightness(currentBrightness, iso);
			luxValue = calculateLuxFromEV(evValue, iso);
			calculateSettings();
		}
	}
	
	function updateAperture(direction: 'up' | 'down') {
		if (!isLocked) return;
		
		const currentValue = parseFloat(aperture.replace('f/', ''));
		const currentIndex = apertureValues.indexOf(currentValue);
		
		if (direction === 'up' && currentIndex < apertureValues.length - 1) {
			const newValue = apertureValues[currentIndex + 1];
			aperture = `f/${newValue}`;
			// Ajuster la vitesse pour maintenir l'exposition
			adjustShutterSpeedForAperture(newValue);
		} else if (direction === 'down' && currentIndex > 0) {
			const newValue = apertureValues[currentIndex - 1];
			aperture = `f/${newValue}`;
			// Ajuster la vitesse pour maintenir l'exposition
			adjustShutterSpeedForAperture(newValue);
		}
	}
	
	function updateShutterSpeed(direction: 'up' | 'down') {
		if (!isLocked) return;
		
		const currentValue = parseFloat(shutterSpeed.replace('1/', ''));
		const currentIndex = shutterSpeedValues.indexOf(currentValue);
		
		if (direction === 'up' && currentIndex < shutterSpeedValues.length - 1) {
			const newValue = shutterSpeedValues[currentIndex + 1];
			shutterSpeed = `1/${newValue}`;
			// Ajuster l'ouverture pour maintenir l'exposition
			adjustApertureForShutterSpeed(newValue);
		} else if (direction === 'down' && currentIndex > 0) {
			const newValue = shutterSpeedValues[currentIndex - 1];
			shutterSpeed = `1/${newValue}`;
			// Ajuster l'ouverture pour maintenir l'exposition
			adjustApertureForShutterSpeed(newValue);
		}
	}
	
	function adjustShutterSpeedForAperture(newAperture: number) {
		// Utiliser la formule standard : T = A² * 100 / (ISO * 2^EV)
		const timeInSeconds = calculateShutterSpeed(newAperture, iso, evValue);
		shutterSpeed = formatShutterSpeed(timeInSeconds);
		
		console.log(`Ajustement vitesse: EV=${evValue}, ouverture=${newAperture}, temps=${timeInSeconds.toFixed(6)}s, vitesse=${shutterSpeed}`);
	}
	
	function adjustApertureForShutterSpeed(newShutterSpeed: number) {
		// Calculer l'ouverture nécessaire selon la formule standard
		// A = sqrt(T * ISO * 2^EV / 100)
		const timeInSeconds = 1 / newShutterSpeed;
		const apertureValue = Math.sqrt((timeInSeconds * iso * Math.pow(2, evValue)) / 100);
		
		// Trouver l'ouverture la plus proche
		const closestAperture = apertureValues.reduce((prev, curr) => 
			Math.abs(curr - apertureValue) < Math.abs(prev - apertureValue) ? curr : prev
		);
		
		aperture = `f/${closestAperture}`;
		
		console.log(`Ajustement ouverture: EV=${evValue}, vitesse=${newShutterSpeed}, ouverture_calculée=${apertureValue.toFixed(2)}, choisie=f/${closestAperture}`);
	}
</script>

<div class="meter">
	<!-- Interface -->
	<div class="status">
		<div class="dot" class:active={isMeasuring}></div>
		<span>{isMeasuring ? (isLocked ? 'Mesure bloquée' : 'Mesure active') : 'Initialisation...'}</span>
		
		<!-- Vignette de la vidéo -->
		<div class="video-preview">
			<Camera
				bind:this={cameraComponent}
				width={60}
				height={45}
				facingMode="environment"
				onCameraReady={handleCameraReady}
				onError={handleCameraError}
				bind:videoElement
				bind:canvas
				bind:context
				bind:hasPermission
			/>
		</div>
		
		<button class="lock-btn" class:locked={isLocked} onclick={toggleLock}>
			{isLocked ? '🔒' : '🔓'}
		</button>
	</div>

	<div class="measurements">
		<div class="measurement">
			<div class="value">{currentBrightness}</div>
			<div class="label">Luminosité</div>
		</div>
		<div class="measurement">
			<div class="value">{luxValue.toFixed(0)}</div>
			<div class="label">Lux</div>
		</div>
		<div class="measurement">
			<div class="value">EV {evValue}</div>
			<div class="label">Exposition</div>
		</div>
	</div>

	<div class="settings">
		<div class="setting aperture-setting">
			<div class="label">Ouverture</div>
			<div class="value">{aperture}</div>
			{#if isLocked}
				<div class="manual-controls">
					<button 
						class="control-btn" 
						onclick={() => updateAperture('down')}
						disabled={apertureValues.indexOf(parseFloat(aperture.replace('f/', ''))) === 0}
					>
						−
					</button>
					<button 
						class="control-btn" 
						onclick={() => updateAperture('up')}
						disabled={apertureValues.indexOf(parseFloat(aperture.replace('f/', ''))) === apertureValues.length - 1}
					>
						+
					</button>
				</div>
			{/if}
		</div>
		<div class="setting shutter-setting">
			<div class="label">Vitesse</div>
			<div class="value">{shutterSpeed}</div>
			{#if isLocked}
				<div class="manual-controls">
					<button 
						class="control-btn" 
						onclick={() => updateShutterSpeed('down')}
						disabled={shutterSpeedValues.indexOf(parseFloat(shutterSpeed.replace('1/', ''))) === 0}
					>
						−
					</button>
					<button 
						class="control-btn" 
						onclick={() => updateShutterSpeed('up')}
						disabled={shutterSpeedValues.indexOf(parseFloat(shutterSpeed.replace('1/', ''))) === shutterSpeedValues.length - 1}
					>
						+
					</button>
				</div>
			{/if}
		</div>
		<div class="setting iso-setting">
			<div class="label">ISO</div>
			<div class="value">{iso}</div>
			<div class="iso-controls">
				<button 
					class="iso-btn" 
					onclick={() => {
						const currentIndex = isoValues.indexOf(iso);
						if (currentIndex > 0) {
							updateISO(isoValues[currentIndex - 1]);
						}
					}}
					disabled={isoValues.indexOf(iso) === 0}
				>
					−
				</button>
				<button 
					class="iso-btn" 
					onclick={() => {
						const currentIndex = isoValues.indexOf(iso);
						if (currentIndex < isoValues.length - 1) {
							updateISO(isoValues[currentIndex + 1]);
						}
					}}
					disabled={isoValues.indexOf(iso) === isoValues.length - 1}
				>
					+
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.meter {
		padding: 1rem;
		background: #f8fafc;
		min-height: 100vh;
	}

	.video-preview {
		width: 60px;
		height: 45px;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		flex-shrink: 0;
	}

	.video-preview :global(.camera-container) {
		width: 100%;
		height: 100%;
	}

	.video-preview :global(.camera-video) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: white;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.lock-btn {
		margin-left: auto;
		background: none;
		border: 2px solid #e5e7eb;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.lock-btn:hover {
		border-color: #3b82f6;
		background: #f0f9ff;
	}

	.lock-btn.locked {
		border-color: #ef4444;
		background: #fef2f2;
		color: #ef4444;
	}

	.lock-btn.locked:hover {
		border-color: #dc2626;
		background: #fee2e2;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #ef4444;
	}

	.dot.active {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
	}

	.measurements {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.measurement {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.measurement .value {
		font-size: 2rem;
		font-weight: bold;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.measurement .label {
		font-size: 0.875rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.settings {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
	}

	.setting {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.setting .label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.setting .value {
		font-size: 1.25rem;
		font-weight: bold;
		color: #1f2937;
	}

	.iso-setting {
		position: relative;
	}

	.iso-controls {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
		justify-content: center;
	}

	.iso-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 50%;
		background: #3b82f6;
		color: white;
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.iso-btn:hover:not(:disabled) {
		background: #2563eb;
		transform: scale(1.1);
	}

	.iso-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
	}

	.manual-controls {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
		justify-content: center;
	}

	.control-btn {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 50%;
		background: #6b7280;
		color: white;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.control-btn:hover:not(:disabled) {
		background: #4b5563;
		transform: scale(1.1);
	}

	.control-btn:disabled {
		background: #d1d5db;
		cursor: not-allowed;
		transform: none;
	}
</style>
