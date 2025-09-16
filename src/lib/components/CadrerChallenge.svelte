<script lang="ts">
	import { onMount } from 'svelte';
	import Camera from './Camera.svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';
	import { imageAnalysis } from '../services/imageAnalysis.js';

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
	let analysisResult: {
		similarity: number;
		edgeMatch: number;
		colorMatch: number;
		compositionMatch: number;
		feedback: string;
	} | null = null;
	let isAnalyzing = false;

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

	async function capturePhoto() {
		if (!cameraComponent) return;

		isCapturing = true;
		const imageData = cameraComponent.captureImage();
		
		if (imageData) {
			challengeImage = imageData;
			
			// Lancer l'analyse d'image
			await analyzeImage(imageData, referenceImage);
			
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
		// Considérer le challenge comme réussi si le score est >= 60%
		const success = analysisResult ? analysisResult.similarity >= 60 : false;
		onComplete(success);
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

	// Fonctions d'analyse d'image
	async function analyzeImage(capturedImageData: string, referenceImagePath: string) {
		isAnalyzing = true;
		console.log('🔍 Début de l\'analyse:', { capturedImageData: capturedImageData.substring(0, 50) + '...', referenceImagePath });
		
		try {
			// IA désactivée - utilisation de l'algorithme classique uniquement
			let aiAnalysis = null;
			
			// Charger l'image de référence
			const referenceImage = await loadImage(referenceImagePath);
			console.log('✅ Image de référence chargée:', referenceImage.width, 'x', referenceImage.height);
			
			// Charger l'image capturée
			const capturedImage = await loadImage(capturedImageData);
			console.log('✅ Image capturée chargée:', capturedImage.width, 'x', capturedImage.height);
			
			// Redimensionner les images en gardant les proportions
			const targetSize = 256;
			
			// Calculer les dimensions en gardant les proportions
			const refAspect = referenceImage.width / referenceImage.height;
			const capAspect = capturedImage.width / capturedImage.height;
			
			// Créer des canvas avec les bonnes proportions
			const refCanvas = createCanvas(targetSize, Math.round(targetSize / refAspect));
			const capCanvas = createCanvas(targetSize, Math.round(targetSize / capAspect));
			
			const refCtx = refCanvas.getContext('2d')!;
			const capCtx = capCanvas.getContext('2d')!;
			
			// Dessiner les images en gardant les proportions
			refCtx.drawImage(referenceImage, 0, 0, refCanvas.width, refCanvas.height);
			capCtx.drawImage(capturedImage, 0, 0, capCanvas.width, capCanvas.height);
			
			console.log('📐 Dimensions normalisées:', {
				ref: `${refCanvas.width}x${refCanvas.height}`,
				cap: `${capCanvas.width}x${capCanvas.height}`
			});
			
			// Obtenir les données des pixels
			const refData = refCtx.getImageData(0, 0, refCanvas.width, refCanvas.height);
			const capData = capCtx.getImageData(0, 0, capCanvas.width, capCanvas.height);
			
			// Analyser les différents aspects
			const edgeMatch = analyzeEdgeSimilarity(refData, capData);
			console.log('🔍 Score contours:', edgeMatch);
			
			const colorMatch = analyzeColorSimilarity(refData, capData);
			console.log('🔍 Score couleurs:', colorMatch);
			
			const compositionMatch = analyzeCompositionSimilarity(refData, capData);
			console.log('🔍 Score composition:', compositionMatch);
			
			// Utiliser l'analyse IA si disponible, sinon algorithme classique
			let similarity, feedback;
			
			if (aiAnalysis) {
				// Utiliser l'IA pour le score final
				similarity = aiAnalysis.score;
				feedback = aiAnalysis.reason;
				console.log('🧠 Score basé sur l\'IA:', similarity, feedback);
			} else {
				// Algorithme classique optimisé pour les images de rue
				// Poids : 40% volumes/lignes, 30% composition, 30% couleurs
				const baseSimilarity = Math.round(
					(edgeMatch * 0.4) + 
					(compositionMatch * 0.3) + 
					(colorMatch * 0.3)
				);
				
				// Vérifier les ratios d'aspect pour détecter les incompatibilités
				const refAspect = referenceImage.width / referenceImage.height;
				const capAspect = capturedImage.width / capturedImage.height;
				const aspectRatioDiff = Math.abs(refAspect - capAspect);
				
				// Si les ratios sont très différents, c'est probablement incompatible
				if (aspectRatioDiff > 0.5) {
					similarity = 8; // Score très bas pour formats incompatibles
					feedback = `Images incompatibles (${similarity}%) - Formats très différents (${refAspect.toFixed(2)} vs ${capAspect.toFixed(2)}). Soyez plus attentif au cadrage !`;
					console.log('⚠️ Formats incompatibles - ratio très différent');
				} else if (edgeMatch < 25 && colorMatch < 25 && compositionMatch < 25) {
					similarity = 5; // Score très bas pour images incompatibles
					feedback = `Images incompatibles (${similarity}%) - Aucune similarité détectée. Soyez plus attentif au contenu !`;
					console.log('⚠️ Images probablement incompatibles - score très bas');
				} else if (baseSimilarity < 30) {
					similarity = Math.max(8, baseSimilarity - 15); // Score bas pour similarité très faible
					feedback = `Similarité très faible (${similarity}%) - Images très différentes. Soyez plus attentif !`;
					console.log('⚠️ Similarité très faible - score réduit');
				} else {
					similarity = baseSimilarity;
					
					// Bonus modérés pour éviter les scores artificiellement élevés
					if (edgeMatch >= 80 && colorMatch >= 80 && compositionMatch >= 80) {
						similarity = Math.min(100, similarity + 5);
						console.log('🎯 Bonus appliqué pour excellente correspondance');
					}
					
					// Bonus si l'image est très similaire globalement
					if (similarity >= 85) {
						similarity = Math.min(100, similarity + 3);
						console.log('🌟 Bonus appliqué pour très bonne correspondance');
					}
					
					feedback = generateFeedback(similarity, edgeMatch, colorMatch, compositionMatch);
				}
			}
			
			console.log('🔍 Score global final:', similarity);
			
			analysisResult = {
				similarity,
				edgeMatch,
				colorMatch,
				compositionMatch,
				feedback
			};
			
			console.log('Analyse terminée:', analysisResult);
			
		} catch (error) {
			console.error('Erreur lors de l\'analyse:', error);
			analysisResult = {
				similarity: 0,
				edgeMatch: 0,
				colorMatch: 0,
				compositionMatch: 0,
				feedback: 'Erreur lors de l\'analyse de l\'image'
			};
		} finally {
			isAnalyzing = false;
		}
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = src;
		});
	}

	function createCanvas(width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}

	function analyzeEdgeSimilarity(refData: ImageData, capData: ImageData): number {
		// Analyser les zones principales plutôt que pixel par pixel
		const refZones = analyzeImageZones(refData);
		const capZones = analyzeImageZones(capData);
		
		let totalSimilarity = 0;
		const zoneCount = Math.min(refZones.length, capZones.length);
		
		for (let i = 0; i < zoneCount; i++) {
			const diff = Math.abs(refZones[i] - capZones[i]);
			const similarity = Math.max(0, 100 - (diff / 2.55));
			totalSimilarity += similarity;
		}
		
		return Math.round(totalSimilarity / zoneCount);
	}
	
	function analyzeImageZones(imageData: ImageData): number[] {
		// Diviser l'image en 36 zones (6x6) pour analyser les volumes et lignes de fuite
		const zones: number[] = [];
		const width = imageData.width;
		const height = imageData.height;
		const zoneWidth = Math.floor(width / 6);
		const zoneHeight = Math.floor(height / 6);
		
		for (let row = 0; row < 6; row++) {
			for (let col = 0; col < 6; col++) {
				const startX = col * zoneWidth;
				const startY = row * zoneHeight;
				const endX = Math.min(startX + zoneWidth, width);
				const endY = Math.min(startY + zoneHeight, height);
				
				let totalBrightness = 0;
				let pixelCount = 0;
				
				// Analyser la luminosité pour détecter les volumes
				for (let y = startY; y < endY; y++) {
					for (let x = startX; x < endX; x++) {
						const idx = (y * width + x) * 4;
						const brightness = 0.299 * imageData.data[idx] + 
										 0.587 * imageData.data[idx + 1] + 
										 0.114 * imageData.data[idx + 2];
						totalBrightness += brightness;
						pixelCount++;
					}
				}
				
				const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
				
				// Pondérer les zones centrales (volumes principaux) et les diagonales (lignes de fuite)
				const centerDistance = Math.sqrt(Math.pow(col - 2.5, 2) + Math.pow(row - 2.5, 2));
				const isDiagonal = Math.abs(col - row) <= 1 || Math.abs(col - (5-row)) <= 1;
				const volumeWeight = Math.max(0.7, 1 - (centerDistance / 3.5)); // Plus de poids au centre
				const lineWeight = isDiagonal ? 1.2 : 1.0; // Plus de poids aux diagonales
				
				const weightedBrightness = avgBrightness * volumeWeight * lineWeight;
				zones.push(weightedBrightness);
			}
		}
		
		return zones;
	}

	function detectEdges(imageData: ImageData): number[] {
		const data = imageData.data;
		const width = imageData.width;
		const height = imageData.height;
		const edges: number[] = [];
		
		// Convertir en niveaux de gris et appliquer Sobel
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				const idx = (y * width + x) * 4;
				
				// Calculer les gradients Sobel
				const gx = getGrayValue(data, x - 1, y - 1, width) * -1 +
						   getGrayValue(data, x - 1, y, width) * -2 +
						   getGrayValue(data, x - 1, y + 1, width) * -1 +
						   getGrayValue(data, x + 1, y - 1, width) * 1 +
						   getGrayValue(data, x + 1, y, width) * 2 +
						   getGrayValue(data, x + 1, y + 1, width) * 1;
				
				const gy = getGrayValue(data, x - 1, y - 1, width) * -1 +
						   getGrayValue(data, x, y - 1, width) * -2 +
						   getGrayValue(data, x + 1, y - 1, width) * -1 +
						   getGrayValue(data, x - 1, y + 1, width) * 1 +
						   getGrayValue(data, x, y + 1, width) * 2 +
						   getGrayValue(data, x + 1, y + 1, width) * 1;
				
				const magnitude = Math.sqrt(gx * gx + gy * gy);
				edges.push(magnitude);
			}
		}
		
		return edges;
	}

	function getGrayValue(data: Uint8ClampedArray, x: number, y: number, width: number): number {
		const idx = (y * width + x) * 4;
		return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
	}

	function analyzeColorSimilarity(refData: ImageData, capData: ImageData): number {
		// Pour les images de rue, réduire l'importance des couleurs (focus sur volumes/lignes)
		const refZones = analyzeColorZones(refData);
		const capZones = analyzeColorZones(capData);
		
		let totalSimilarity = 0;
		const zoneCount = Math.min(refZones.length, capZones.length);
		
		for (let i = 0; i < zoneCount; i++) {
			const refZone = refZones[i];
			const capZone = capZones[i];
			
			// Calculer la distance euclidienne dans l'espace RGB
			const diffR = Math.abs(refZone.r - capZone.r);
			const diffG = Math.abs(refZone.g - capZone.g);
			const diffB = Math.abs(refZone.b - capZone.b);
			
			const distance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
			const similarity = Math.max(0, 100 - (distance / 4.41)); // 441 = sqrt(3 * 255^2)
			totalSimilarity += similarity;
		}
		
		// Réduire l'importance des couleurs pour les images de rue (facteur 0.7)
		const baseSimilarity = Math.round(totalSimilarity / zoneCount);
		return Math.round(baseSimilarity * 0.7);
	}
	
	function analyzeColorZones(imageData: ImageData): { r: number; g: number; b: number }[] {
		// Diviser l'image en 9 zones (3x3) et analyser les couleurs de chaque zone
		const zones: { r: number; g: number; b: number }[] = [];
		const width = imageData.width;
		const height = imageData.height;
		const zoneWidth = Math.floor(width / 3);
		const zoneHeight = Math.floor(height / 3);
		
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				const startX = col * zoneWidth;
				const startY = row * zoneHeight;
				const endX = Math.min(startX + zoneWidth, width);
				const endY = Math.min(startY + zoneHeight, height);
				
				let totalR = 0, totalG = 0, totalB = 0;
				let pixelCount = 0;
				
				for (let y = startY; y < endY; y++) {
					for (let x = startX; x < endX; x++) {
						const idx = (y * width + x) * 4;
						totalR += imageData.data[idx];
						totalG += imageData.data[idx + 1];
						totalB += imageData.data[idx + 2];
						pixelCount++;
					}
				}
				
				zones.push({
					r: totalR / pixelCount,
					g: totalG / pixelCount,
					b: totalB / pixelCount
				});
			}
		}
		
		return zones;
	}

	function calculateColorHistogram(imageData: ImageData): number[] {
		const data = imageData.data;
		const histogram = new Array(64).fill(0);
		const total = data.length / 4;
		
		for (let i = 0; i < data.length; i += 4) {
			const r = Math.floor(data[i] / 4);
			const g = Math.floor(data[i + 1] / 4);
			const b = Math.floor(data[i + 2] / 4);
			const bin = r * 16 + g * 4 + b;
			histogram[bin]++;
		}
		
		// Normaliser
		return histogram.map(count => count / total);
	}

	function analyzeCompositionSimilarity(refData: ImageData, capData: ImageData): number {
		// Analyser la composition pour les images de rue : lignes de fuite et volumes
		const width = refData.width;
		const height = refData.height;
		
		// Analyser les lignes de fuite (diagonales principales)
		const diagonalZones = [
			// Diagonale principale (haut-gauche vers bas-droite)
			{ x: 0, y: 0, w: width/3, h: height/3 },
			{ x: width/3, y: height/3, w: width/3, h: height/3 },
			{ x: 2*width/3, y: 2*height/3, w: width/3, h: height/3 },
			// Diagonale secondaire (haut-droite vers bas-gauche)
			{ x: 2*width/3, y: 0, w: width/3, h: height/3 },
			{ x: width/3, y: height/3, w: width/3, h: height/3 },
			{ x: 0, y: 2*height/3, w: width/3, h: height/3 }
		];
		
		// Analyser les volumes centraux
		const volumeZones = [
			{ x: width/4, y: height/4, w: width/2, h: height/2 }, // Centre principal
			{ x: width/6, y: height/6, w: 2*width/3, h: 2*height/3 } // Zone étendue
		];
		
		let totalSimilarity = 0;
		let validZones = 0;
		
		// Analyser les lignes de fuite (poids 1.5)
		for (const zone of diagonalZones) {
			const refBrightness = getQuadrantBrightness(refData, zone);
			const capBrightness = getQuadrantBrightness(capData, zone);
			
			if (!isNaN(refBrightness) && !isNaN(capBrightness)) {
				const diff = Math.abs(refBrightness - capBrightness);
				const similarity = Math.max(0, 100 - (diff / 2.55));
				totalSimilarity += similarity * 1.5; // Poids pour lignes de fuite
				validZones += 1.5;
			}
		}
		
		// Analyser les volumes (poids 1.0)
		for (const zone of volumeZones) {
			const refBrightness = getQuadrantBrightness(refData, zone);
			const capBrightness = getQuadrantBrightness(capData, zone);
			
			if (!isNaN(refBrightness) && !isNaN(capBrightness)) {
				const diff = Math.abs(refBrightness - capBrightness);
				const similarity = Math.max(0, 100 - (diff / 2.55));
				totalSimilarity += similarity * 1.0; // Poids normal pour volumes
				validZones += 1.0;
			}
		}
		
		const result = validZones > 0 ? Math.round(totalSimilarity / validZones) : 0;
		return isNaN(result) ? 0 : result;
	}
	
	function getQuadrantBrightness(imageData: ImageData, quadrant: { x: number; y: number; w: number; h: number }): number {
		const data = imageData.data;
		let totalBrightness = 0;
		let pixelCount = 0;
		
		for (let y = quadrant.y; y < quadrant.y + quadrant.h; y++) {
			for (let x = quadrant.x; x < quadrant.x + quadrant.w; x++) {
				const idx = (y * imageData.width + x) * 4;
				const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
				totalBrightness += brightness;
				pixelCount++;
			}
		}
		
		const result = pixelCount > 0 ? totalBrightness / pixelCount : 0;
		return isNaN(result) ? 0 : result;
	}

	function analyzeComposition(imageData: ImageData): { x: number; y: number }[] {
		// Trouver les points d'intérêt (zones de forte variation)
		const points: { x: number; y: number }[] = [];
		const data = imageData.data;
		const width = imageData.width;
		const height = imageData.height;
		
		// Analyser par quadrants (règle des tiers)
		const thirdX = width / 3;
		const thirdY = height / 3;
		
		for (let y = thirdY; y < height - thirdY; y += thirdY) {
			for (let x = thirdX; x < width - thirdX; x += thirdX) {
				const intensity = getGrayValue(data, x, y, width);
				if (intensity > 100) { // Seuil d'intérêt
					points.push({ x, y });
				}
			}
		}
		
		return points;
	}

	function generateFeedback(similarity: number, edgeMatch: number, colorMatch: number, compositionMatch: number): string {
		console.log('📊 Scores détaillés:', { similarity, edgeMatch, colorMatch, compositionMatch });
		
		// Détecter si les images sont vraiment incompatibles
		if (edgeMatch < 15 && colorMatch < 15 && compositionMatch < 15) {
			return `❌ Images incompatibles (${similarity}%) - L'image de référence et votre photo sont trop différentes. Changez d'image de référence ou recadrez différemment.`;
		}
		
		// Feedback spécifique aux images de rue
		if (similarity >= 80) {
			return `🎯 Excellent ! Score: ${similarity}% - Cadrage parfait ! Volumes et lignes de fuite parfaitement alignés.`;
		} else if (similarity >= 60) {
			return `🌟 Très bien ! Score: ${similarity}% - Très bon cadrage ! Les volumes correspondent bien.`;
		} else if (similarity >= 40) {
			return `✅ Bien ! Score: ${similarity}% - Bon cadrage, ajustez légèrement les lignes de fuite.`;
		} else if (similarity >= 20) {
			return `⚠️ Moyen. Score: ${similarity}% - Essayez de mieux aligner les volumes et lignes de fuite.`;
		} else {
			return `❌ Images incompatibles (${similarity}%) - L'image de référence et votre photo sont trop différentes.`;
		}
	}

	// Fonction de test pour déboguer
	function testAnalysis() {
		console.log('🧪 Test de l\'analyse avec des données factices...');
		
		// Créer des données de test identiques
		const testData = new ImageData(256, 256);
		for (let i = 0; i < testData.data.length; i += 4) {
			testData.data[i] = 100;     // R
			testData.data[i + 1] = 150; // G
			testData.data[i + 2] = 200; // B
			testData.data[i + 3] = 255; // A
		}
		
		const edgeScore = analyzeEdgeSimilarity(testData, testData);
		const colorScore = analyzeColorSimilarity(testData, testData);
		const compScore = analyzeCompositionSimilarity(testData, testData);
		
		console.log('🧪 Test résultats (images identiques):', { edgeScore, colorScore, compScore });
		
		// Calculer le score avec la même logique que l'analyse réelle
		const baseSimilarity = Math.round((edgeScore + colorScore + compScore) / 3);
		let similarity = baseSimilarity;
		
		// Appliquer les bonus (même logique que l'analyse réelle)
		if (edgeScore >= 80 && colorScore >= 80 && compScore >= 80) {
			similarity = Math.min(100, similarity + 5);
		}
		if (similarity >= 85) {
			similarity = Math.min(100, similarity + 3);
		}
		
		console.log('🧪 Score final du test:', similarity);
		
		// Simuler l'analyse complète
		analysisResult = {
			similarity,
			edgeMatch: edgeScore,
			colorMatch: colorScore,
			compositionMatch: compScore,
			feedback: generateFeedback(similarity, edgeScore, colorScore, compScore)
		};
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
					
					<!-- Bouton de test pour déboguer -->
					<MobileButton 
						variant="outline" 
						on:click={testAnalysis}
						size="sm"
					>
						🧪 Test analyse
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
				
				<!-- Indicateur de chargement -->
				{#if isAnalyzing}
					<div class="analysis-loading">
						<div class="loading-spinner"></div>
						<p>Analyse du cadrage en cours...</p>
					</div>
				{/if}
				
				<!-- Résultats d'analyse -->
				{#if analysisResult && !isAnalyzing}
					<div class="analysis-results">
						<div class="analysis-header">
							<h3>📊 Analyse du cadrage</h3>
						</div>
						
						<div class="score-display">
							<div class="main-score">
								<span class="score-number">{analysisResult.similarity}%</span>
								<span class="score-label">Score global</span>
							</div>
						</div>
						
						<div class="detailed-scores">
							<div class="score-item">
								<span class="score-name">Contours</span>
								<div class="score-bar">
									<div class="score-fill" style="width: {analysisResult.edgeMatch}%"></div>
								</div>
								<span class="score-value">{analysisResult.edgeMatch}%</span>
							</div>
							
							<div class="score-item">
								<span class="score-name">Couleurs</span>
								<div class="score-bar">
									<div class="score-fill" style="width: {analysisResult.colorMatch}%"></div>
								</div>
								<span class="score-value">{analysisResult.colorMatch}%</span>
							</div>
							
							<div class="score-item">
								<span class="score-name">Composition</span>
								<div class="score-bar">
									<div class="score-fill" style="width: {analysisResult.compositionMatch}%"></div>
								</div>
								<span class="score-value">{analysisResult.compositionMatch}%</span>
							</div>
						</div>
						
						<div class="feedback-message" class:incompatible={analysisResult.similarity < 15}>
							<p>{analysisResult.feedback}</p>
							{#if analysisResult.similarity < 15}
								<div class="incompatible-warning">
									<p>💡 <strong>Conseil :</strong> Essayez de reproduire la composition de l'image de référence, ou changez d'image de référence.</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}
				
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

	.analysis-results {
		margin: 1.5rem 0;
		padding: 1.5rem;
		background: #f8fafc;
		border-radius: 0.75rem;
		border: 1px solid #e2e8f0;
	}

	.analysis-header h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		text-align: center;
	}

	.score-display {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.main-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.score-number {
		font-size: 3rem;
		font-weight: 700;
		color: #3b82f6;
		line-height: 1;
	}

	.score-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.detailed-scores {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.score-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.score-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		min-width: 80px;
	}

	.score-bar {
		flex: 1;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}

	.score-fill {
		height: 100%;
		background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.score-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		min-width: 40px;
		text-align: right;
	}

	.feedback-message {
		text-align: center;
		padding: 1rem;
		background: white;
		border-radius: 0.5rem;
		border: 1px solid #d1d5db;
	}

	.feedback-message p {
		margin: 0;
		font-size: 0.875rem;
		color: #374151;
		font-weight: 500;
	}

	.feedback-message.incompatible {
		background: #fef2f2;
		border-color: #fca5a5;
	}

	.incompatible-warning {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #fef3c7;
		border-radius: 0.375rem;
		border-left: 4px solid #f59e0b;
	}

	.incompatible-warning p {
		margin: 0;
		font-size: 0.8rem;
		color: #92400e;
	}

	.analysis-loading {
		text-align: center;
		padding: 2rem;
		margin: 1.5rem 0;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.analysis-loading p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}
</style>
