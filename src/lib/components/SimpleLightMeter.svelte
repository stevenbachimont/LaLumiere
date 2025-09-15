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
	
	// Références aux colonnes scrollables
	let shutterSpeedColumn: HTMLDivElement;
	let apertureColumn: HTMLDivElement;
	let isoColumn: HTMLDivElement;

	// Données de mesure
	let currentBrightness = $state(0);
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

	// Mode de calcul (quel réglage est fixe)
	let fixedSetting: 'aperture' | 'shutterSpeed' | 'iso' = 'aperture';

	onMount(async () => {
		console.log('SimpleLightMeter: onMount');
		await requestCameraPermission();
		
		// Initialiser le scroll des colonnes après un délai pour s'assurer qu'elles sont montées
		setTimeout(() => {
			updateColumnScroll('aperture', getApertureIndex());
			updateColumnScroll('shutterSpeed', getShutterSpeedIndex());
			updateColumnScroll('iso', getISOIndex());
		}, 100);
	});

	onDestroy(() => {
		stopCamera();
	});

	async function requestCameraPermission() {
		try {
			console.log('SimpleLightMeter: Démarrage de la caméra');
			
			const constraints = {
				video: {
					width: { ideal: 640 },
					height: { ideal: 480 }
				}
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;
			
			console.log('SimpleLightMeter: Caméra démarrée');
			
			// Attendre que la vidéo soit prête
			videoElement.addEventListener('loadedmetadata', () => {
				console.log('SimpleLightMeter: Vidéo chargée');
				initializeCanvas();
				startMeasuring();
			});
			
		} catch (error) {
			console.error('SimpleLightMeter: Erreur d\'accès à la caméra:', error);
		}
	}

	function initializeCanvas() {
		if (canvas) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				// Optimiser pour les lectures fréquentes de données d'image
				(ctx as any).willReadFrequently = true;
				context = ctx;
				canvas.width = videoElement.videoWidth || 640;
				canvas.height = videoElement.videoHeight || 480;
				console.log('SimpleLightMeter: Canvas initialisé avec willReadFrequently');
			}
		}
	}

	function startMeasuring() {
		if (!stream) {
			console.log('SimpleLightMeter: Impossible de démarrer - pas de stream');
			return;
		}
		
		console.log('SimpleLightMeter: Démarrage de la mesure');
		isMeasuring = true;
		measureBrightness();
	}

	function stopMeasuring() {
		console.log('SimpleLightMeter: Arrêt de la mesure');
		isMeasuring = false;
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}

	function measureBrightness() {
		if (!isMeasuring || !videoElement || !canvas || !context) {
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
		
		// Calculer les réglages recommandés
		calculateRecommendedSettings(currentBrightness);
		
		// Continuer la mesure si activée
		if (isMeasuring) {
			requestAnimationFrame(measureBrightness);
		}
	}

	function calculateRecommendedSettings(brightness: number) {
		let aperture = 'f/8';
		let shutterSpeed = '1/125';
		let iso = 400;

		if (brightness < 50) {
			aperture = 'f/2.8';
			shutterSpeed = '1/30';
			iso = 1600;
		} else if (brightness < 100) {
			aperture = 'f/4';
			shutterSpeed = '1/60';
			iso = 800;
		} else if (brightness < 150) {
			aperture = 'f/5.6';
			shutterSpeed = '1/125';
			iso = 400;
		} else if (brightness < 200) {
			aperture = 'f/8';
			shutterSpeed = '1/250';
			iso = 200;
		} else {
			aperture = 'f/11';
			shutterSpeed = '1/500';
			iso = 100;
		}

		recommendedSettings = { aperture, shutterSpeed, iso };
		
		// Mettre à jour les réglages manuels seulement en mode automatique et s'ils ne sont pas verrouillés
		if (isAutoMode) {
			if (!lockedSettings.aperture) {
				manualSettings = { ...manualSettings, aperture };
				const apertureIndex = apertureValues.indexOf(aperture);
				// Délai pour s'assurer que le DOM est mis à jour
				setTimeout(() => updateColumnScroll('aperture', apertureIndex), 10);
			}
			
			if (!lockedSettings.shutterSpeed) {
				manualSettings = { ...manualSettings, shutterSpeed };
				const shutterSpeedIndex = shutterSpeedValues.indexOf(shutterSpeed);
				// Délai pour s'assurer que le DOM est mis à jour
				setTimeout(() => updateColumnScroll('shutterSpeed', shutterSpeedIndex), 10);
			}
			
			if (!lockedSettings.iso) {
				manualSettings = { ...manualSettings, iso };
				const isoIndex = isoValues.indexOf(iso);
				// Délai pour s'assurer que le DOM est mis à jour
				setTimeout(() => updateColumnScroll('iso', isoIndex), 10);
			}
		}
	}


	// Fonction pour calculer l'exposition équivalente
	function calculateEquivalentExposure() {
		// Calculer l'EV (Exposure Value) basé sur la luminosité
		const ev = Math.log2(currentBrightness / 12.5);
		
		// Calculer les réglages équivalents
		if (fixedSetting === 'aperture') {
			// Aperture fixe, calculer vitesse et ISO
			const apertureValue = parseFloat(manualSettings.aperture.replace('f/', ''));
			const baseEV = Math.log2(apertureValue * apertureValue);
			const targetEV = ev;
			const evDiff = targetEV - baseEV;
			
			// Ajuster la vitesse
			const currentSpeedIndex = shutterSpeedValues.indexOf(manualSettings.shutterSpeed);
			const newSpeedIndex = Math.max(0, Math.min(shutterSpeedValues.length - 1, currentSpeedIndex + Math.round(evDiff)));
			manualSettings.shutterSpeed = shutterSpeedValues[newSpeedIndex];
			
			// Ajuster l'ISO si nécessaire
			if (evDiff > 2) {
				const currentIsoIndex = isoValues.indexOf(manualSettings.iso);
				manualSettings.iso = isoValues[Math.min(isoValues.length - 1, currentIsoIndex + 1)];
			} else if (evDiff < -2) {
				const currentIsoIndex = isoValues.indexOf(manualSettings.iso);
				manualSettings.iso = isoValues[Math.max(0, currentIsoIndex - 1)];
			}
		} else if (fixedSetting === 'shutterSpeed') {
			// Vitesse fixe, calculer ouverture et ISO
			const speedValue = parseFloat(manualSettings.shutterSpeed.replace('1/', '').replace('s', ''));
			const baseEV = Math.log2(1 / speedValue);
			const targetEV = ev;
			const evDiff = targetEV - baseEV;
			
			// Ajuster l'ouverture
			const currentApertureIndex = apertureValues.indexOf(manualSettings.aperture);
			const newApertureIndex = Math.max(0, Math.min(apertureValues.length - 1, currentApertureIndex + Math.round(evDiff / 2)));
			manualSettings.aperture = apertureValues[newApertureIndex];
			
			// Ajuster l'ISO si nécessaire
			if (evDiff > 2) {
				const currentIsoIndex = isoValues.indexOf(manualSettings.iso);
				manualSettings.iso = isoValues[Math.min(isoValues.length - 1, currentIsoIndex + 1)];
			} else if (evDiff < -2) {
				const currentIsoIndex = isoValues.indexOf(manualSettings.iso);
				manualSettings.iso = isoValues[Math.max(0, currentIsoIndex - 1)];
			}
		} else if (fixedSetting === 'iso') {
			// ISO fixe, calculer ouverture et vitesse
			const isoValue = manualSettings.iso;
			const baseEV = Math.log2(isoValue / 100);
			const targetEV = ev;
			const evDiff = targetEV - baseEV;
			
			// Ajuster l'ouverture
			const currentApertureIndex = apertureValues.indexOf(manualSettings.aperture);
			const newApertureIndex = Math.max(0, Math.min(apertureValues.length - 1, currentApertureIndex + Math.round(evDiff / 2)));
			manualSettings.aperture = apertureValues[newApertureIndex];
			
			// Ajuster la vitesse
			const currentSpeedIndex = shutterSpeedValues.indexOf(manualSettings.shutterSpeed);
			const newSpeedIndex = Math.max(0, Math.min(shutterSpeedValues.length - 1, currentSpeedIndex + Math.round(evDiff)));
			manualSettings.shutterSpeed = shutterSpeedValues[newSpeedIndex];
		}
		
		// Les réglages sont déjà mis à jour via les fonctions changeX
	}


	// Fonctions pour les boutons +/-
	function getApertureIndex() {
		return apertureValues.indexOf(manualSettings.aperture);
	}

	function getShutterSpeedIndex() {
		return shutterSpeedValues.indexOf(manualSettings.shutterSpeed);
	}

	function getISOIndex() {
		return isoValues.indexOf(manualSettings.iso);
	}

	function changeAperture(direction: number) {
		if (lockedSettings.aperture) return;
		
		const currentIndex = getApertureIndex();
		const newIndex = Math.max(0, Math.min(apertureValues.length - 1, currentIndex + direction));
		const newAperture = apertureValues[newIndex];
		console.log('SimpleLightMeter: Changement ouverture vers', newAperture);
		manualSettings = { ...manualSettings, aperture: newAperture };
		updateColumnScroll('aperture', newIndex);
	}

	function changeShutterSpeed(direction: number) {
		if (lockedSettings.shutterSpeed) return;
		
		const currentIndex = getShutterSpeedIndex();
		const newIndex = Math.max(0, Math.min(shutterSpeedValues.length - 1, currentIndex + direction));
		const newSpeed = shutterSpeedValues[newIndex];
		console.log('SimpleLightMeter: Changement vitesse vers', newSpeed);
		manualSettings = { ...manualSettings, shutterSpeed: newSpeed };
		updateColumnScroll('shutterSpeed', newIndex);
	}

	function changeISO(direction: number) {
		if (lockedSettings.iso) return;
		
		const currentIndex = getISOIndex();
		const newIndex = Math.max(0, Math.min(isoValues.length - 1, currentIndex + direction));
		const newISO = isoValues[newIndex];
		console.log('SimpleLightMeter: Changement ISO vers', newISO);
		manualSettings = { ...manualSettings, iso: newISO };
		updateColumnScroll('iso', newIndex);
	}

	// Fonction pour mettre à jour le scroll des colonnes et centrer la valeur dans la bande
	function updateColumnScroll(setting: 'aperture' | 'shutterSpeed' | 'iso', index: number) {
		const itemHeight = 50;
		const marginHeight = 100; // Hauteur des marges
		const containerHeight = 150; // Hauteur de la zone de scroll
		const centerOffset = (containerHeight - itemHeight) / 2; // Centrer dans la bande
		
		// Position pour centrer la valeur dans la bande bleue
		const scrollPosition = marginHeight + (index * itemHeight) - centerOffset;
		
		if (setting === 'aperture' && apertureColumn) {
			apertureColumn.scrollTop = Math.max(0, scrollPosition);
		} else if (setting === 'shutterSpeed' && shutterSpeedColumn) {
			shutterSpeedColumn.scrollTop = Math.max(0, scrollPosition);
		} else if (setting === 'iso' && isoColumn) {
			isoColumn.scrollTop = Math.max(0, scrollPosition);
		}
	}

	// Fonctions de verrouillage
	function toggleLock(setting: 'aperture' | 'shutterSpeed' | 'iso') {
		lockedSettings = { ...lockedSettings, [setting]: !lockedSettings[setting] };
		console.log(`SimpleLightMeter: ${setting} ${lockedSettings[setting] ? 'verrouillé' : 'déverrouillé'}`);
	}

	// Fonctions de défilement tactile et souris
	let touchStartY = 0;
	let touchStartScrollTop = 0;
	let mouseStartY = 0;
	let mouseStartScrollTop = 0;
	let isMouseDown = false;

	function handleTouchStart(event: TouchEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		if (lockedSettings[setting]) return;
		
		touchStartY = event.touches[0].clientY;
		let column: HTMLDivElement | null = null;
		
		if (setting === 'aperture') {
			column = apertureColumn;
		} else if (setting === 'shutterSpeed') {
			column = shutterSpeedColumn;
		} else {
			column = isoColumn;
		}
		
		if (column) {
			touchStartScrollTop = column.scrollTop;
		}
	}

	function handleTouchMove(event: TouchEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		if (lockedSettings[setting]) return;
		
		event.preventDefault();
		const touchY = event.touches[0].clientY;
		const deltaY = touchStartY - touchY;
		
		let column: HTMLDivElement | null = null;
		if (setting === 'aperture') {
			column = apertureColumn;
		} else if (setting === 'shutterSpeed') {
			column = shutterSpeedColumn;
		} else {
			column = isoColumn;
		}
		
		if (column) {
			const newScrollTop = touchStartScrollTop + deltaY;
			column.scrollTop = Math.max(0, newScrollTop);
			
			// Mettre à jour la valeur basée sur la position de scroll
			updateValueFromScroll(column, setting);
		}
	}

	// Fonctions de gestion des événements de souris (trackpad)
	function handleMouseStart(event: MouseEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		if (lockedSettings[setting]) return;
		
		event.preventDefault();
		isMouseDown = true;
		mouseStartY = event.clientY;
		
		let column: HTMLDivElement | null = null;
		if (setting === 'aperture') {
			column = apertureColumn;
		} else if (setting === 'shutterSpeed') {
			column = shutterSpeedColumn;
		} else {
			column = isoColumn;
		}
		
		if (column) {
			mouseStartScrollTop = column.scrollTop;
		}
	}

	function handleMouseMove(event: MouseEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		if (lockedSettings[setting] || !isMouseDown) return;
		
		event.preventDefault();
		const mouseY = event.clientY;
		const deltaY = mouseStartY - mouseY;
		
		let column: HTMLDivElement | null = null;
		if (setting === 'aperture') {
			column = apertureColumn;
		} else if (setting === 'shutterSpeed') {
			column = shutterSpeedColumn;
		} else {
			column = isoColumn;
		}
		
		if (column) {
			const newScrollTop = mouseStartScrollTop + deltaY;
			column.scrollTop = Math.max(0, newScrollTop);
			
			// Mettre à jour la valeur basée sur la position de scroll
			updateValueFromScroll(column, setting);
		}
	}

	function handleMouseEnd(event: MouseEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		isMouseDown = false;
	}

	function handleWheel(event: WheelEvent, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		if (lockedSettings[setting]) return;
		
		event.preventDefault();
		const deltaY = event.deltaY;
		const sensitivity = 3; // Sensibilité du scroll
		
		let column: HTMLDivElement | null = null;
		if (setting === 'aperture') {
			column = apertureColumn;
		} else if (setting === 'shutterSpeed') {
			column = shutterSpeedColumn;
		} else {
			column = isoColumn;
		}
		
		if (column) {
			const newScrollTop = column.scrollTop + (deltaY * sensitivity);
			column.scrollTop = Math.max(0, newScrollTop);
			
			// Mettre à jour la valeur basée sur la position de scroll
			updateValueFromScroll(column, setting);
		}
	}

	// Fonction utilitaire pour mettre à jour la valeur basée sur le scroll
	function updateValueFromScroll(column: HTMLDivElement, setting: 'aperture' | 'shutterSpeed' | 'iso') {
		const itemHeight = 50;
		const marginHeight = 100; // Hauteur des marges
		const containerHeight = 150; // Hauteur de la zone de scroll
		const centerOffset = (containerHeight - itemHeight) / 2; // Centrer dans la bande
		
		// Calculer l'index basé sur la position centrée
		const scrollIndex = Math.round((column.scrollTop + centerOffset - marginHeight) / itemHeight);
		
		if (setting === 'aperture' && scrollIndex >= 0 && scrollIndex < apertureValues.length) {
			const newAperture = apertureValues[scrollIndex];
			if (newAperture !== manualSettings.aperture) {
				manualSettings = { ...manualSettings, aperture: newAperture };
			}
		} else if (setting === 'shutterSpeed' && scrollIndex >= 0 && scrollIndex < shutterSpeedValues.length) {
			const newSpeed = shutterSpeedValues[scrollIndex];
			if (newSpeed !== manualSettings.shutterSpeed) {
				manualSettings = { ...manualSettings, shutterSpeed: newSpeed };
			}
		} else if (setting === 'iso' && scrollIndex >= 0 && scrollIndex < isoValues.length) {
			const newISO = isoValues[scrollIndex];
			if (newISO !== manualSettings.iso) {
				manualSettings = { ...manualSettings, iso: newISO };
			}
		}
	}

</script>

<div class="simple-light-meter">
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
		
	</div>

	<!-- Statut de mesure -->
	<div class="measurement-status">
		<div class="status-indicator">
			<div class="status-dot" class:active={isMeasuring}></div>
			<span>{isMeasuring ? 'Mesure active' : 'Initialisation...'}</span>
		</div>
	</div>

	<!-- Affichage des résultats -->
	<div class="results-section">
		<MobileCard title="Luminosité actuelle">
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

		<!-- Réglages de l'appareil - Interface tactile avec colonnes scrollables -->
		<div class="settings-table">
			<!-- En-têtes -->
			<div class="table-header">
				<div class="header-cell">
					<div class="header-icon">⏱️</div>
					<div class="header-label">VITESSE</div>
				</div>
				<div class="header-cell">
					<div class="header-icon">f</div>
					<div class="header-label">OUVERTURE</div>
				</div>
				<div class="header-cell">
					<div class="header-icon">ISO</div>
					<div class="header-label">ISO</div>
				</div>
			</div>

			<!-- Colonnes scrollables avec bande de sélection -->
			<div class="scrollable-columns">
				<!-- Bande de sélection fixe -->
				<div class="selection-band"></div>
				
				<!-- Colonne Vitesse -->
				<div 
					class="value-column"
					bind:this={shutterSpeedColumn}
					ontouchstart={(e) => handleTouchStart(e, 'shutterSpeed')}
					ontouchmove={(e) => handleTouchMove(e, 'shutterSpeed')}
					onmousedown={(e) => handleMouseStart(e, 'shutterSpeed')}
					onmousemove={(e) => handleMouseMove(e, 'shutterSpeed')}
					onmouseup={(e) => handleMouseEnd(e, 'shutterSpeed')}
					onwheel={(e) => handleWheel(e, 'shutterSpeed')}
				>
					<!-- Marge supérieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
					{#each shutterSpeedValues as speed, index}
						<div 
							class="value-item" 
							class:active={speed === manualSettings.shutterSpeed}
							class:locked={lockedSettings.shutterSpeed}
						>
							{speed}"
						</div>
					{/each}
					<!-- Marge inférieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
				</div>

				<!-- Colonne Ouverture -->
				<div 
					class="value-column"
					bind:this={apertureColumn}
					ontouchstart={(e) => handleTouchStart(e, 'aperture')}
					ontouchmove={(e) => handleTouchMove(e, 'aperture')}
					onmousedown={(e) => handleMouseStart(e, 'aperture')}
					onmousemove={(e) => handleMouseMove(e, 'aperture')}
					onmouseup={(e) => handleMouseEnd(e, 'aperture')}
					onwheel={(e) => handleWheel(e, 'aperture')}
				>
					<!-- Marge supérieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
					{#each apertureValues as aperture, index}
						<div 
							class="value-item" 
							class:active={aperture === manualSettings.aperture}
							class:locked={lockedSettings.aperture}
						>
							{aperture.replace('f/', '')}
						</div>
					{/each}
					<!-- Marge inférieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
				</div>

				<!-- Colonne ISO -->
				<div 
					class="value-column"
					bind:this={isoColumn}
					ontouchstart={(e) => handleTouchStart(e, 'iso')}
					ontouchmove={(e) => handleTouchMove(e, 'iso')}
					onmousedown={(e) => handleMouseStart(e, 'iso')}
					onmousemove={(e) => handleMouseMove(e, 'iso')}
					onmouseup={(e) => handleMouseEnd(e, 'iso')}
					onwheel={(e) => handleWheel(e, 'iso')}
				>
					<!-- Marge supérieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
					{#each isoValues as iso, index}
						<div 
							class="value-item" 
							class:active={iso === manualSettings.iso}
							class:locked={lockedSettings.iso}
						>
							{iso}
						</div>
					{/each}
					<!-- Marge inférieure pour les valeurs extrêmes -->
					<div class="margin-spacer"></div>
				</div>
			</div>

			<!-- Icônes de cadenas interactives -->
			<div class="lock-icons">
				<button 
					class="lock-button" 
					class:locked={lockedSettings.shutterSpeed}
					onclick={() => toggleLock('shutterSpeed')}
				>
					{lockedSettings.shutterSpeed ? '🔒' : '🔓'}
				</button>
				<button 
					class="lock-button" 
					class:locked={lockedSettings.aperture}
					onclick={() => toggleLock('aperture')}
				>
					{lockedSettings.aperture ? '🔒' : '🔓'}
				</button>
				<button 
					class="lock-button" 
					class:locked={lockedSettings.iso}
					onclick={() => toggleLock('iso')}
				>
					{lockedSettings.iso ? '🔒' : '🔓'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.simple-light-meter {
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
		position: relative;
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


	/* Interface tactile avec colonnes scrollables */
	.settings-table {
		background: #2d3748;
		border-radius: 1rem;
		padding: 1rem;
		margin: 1rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.header-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.header-icon {
		font-size: 1.5rem;
		color: #a0aec0;
	}

	.header-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #a0aec0;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.scrollable-columns {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		height: 200px;
		margin-bottom: 1rem;
		position: relative;
		overflow: hidden;
	}

	.selection-band {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 50px;
		background: rgba(99, 179, 237, 0.3);
		border: 2px solid #63b3ed;
		border-radius: 8px;
		z-index: 10;
		pointer-events: none;
		transform: translateY(-50%);
	}

	.value-column {
		background: #4a5568;
		border-radius: 0.5rem;
		overflow-y: auto;
		position: relative;
		scrollbar-width: none;
		-ms-overflow-style: none;
		cursor: grab;
		user-select: none;
	}

	.value-column:active {
		cursor: grabbing;
	}

	.value-column::-webkit-scrollbar {
		display: none;
	}

	.margin-spacer {
		height: 100px;
		width: 100%;
	}


	.value-item {
		padding: 0.75rem;
		text-align: center;
		font-size: 1rem;
		font-weight: 500;
		color: #a0aec0;
		border-bottom: 1px solid #718096;
		transition: all 0.2s ease;
		user-select: none;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.value-item.active {
		/* Pas de mise en surbrillance - la bande bleue indique la sélection */
	}

	.value-item.locked {
		opacity: 0.5;
		background: #718096;
	}

	.lock-icons {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		justify-items: center;
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

	/* Mode toggle */
	.mode-toggle {
		background: white;
		padding: 1rem 1.5rem;
		border-radius: 12px;
		margin-bottom: 1rem;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.mode-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}
</style>
