// Service d'analyse d'images avec algorithmes gratuits
export class ImageAnalysisService {
  constructor() {
    // Pas de clé API nécessaire - algorithmes gratuits
  }

  async analyzeImage(imageData) {
    try {
      // Analyser l'image avec des algorithmes gratuits
      return await this.analyzeWithFreeAlgorithms(imageData);
    } catch (error) {
      console.error('Erreur analyse:', error);
      return null;
    }
  }

  async analyzeWithFreeAlgorithms(imageData) {
    // Créer un canvas pour analyser l'image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Analyser les caractéristiques de l'image
        const analysis = {
          labels: this.detectImageType(imageData),
          objects: this.detectObjects(imageData),
          composition: this.analyzeComposition(imageData),
          colors: this.analyzeColors(imageData)
        };
        
        resolve(analysis);
      };
      
      img.src = imageData;
    });
  }

  // Détecter le type d'image (portrait, paysage, architecture)
  detectImageType(imageData) {
    const { width, height, data } = imageData;
    const aspectRatio = width / height;
    
    // Analyser la distribution des couleurs
    const colorAnalysis = this.analyzeColors(imageData);
    const isGrayscale = colorAnalysis.isGrayscale;
    const isColorful = colorAnalysis.isColorful;
    
    // Analyser la complexité
    const complexity = this.calculateComplexity(imageData);
    
    const labels = [];
    
    // Détecter le type de composition
    if (aspectRatio > 1.5) {
      labels.push('landscape');
    } else if (aspectRatio < 0.8) {
      labels.push('portrait');
    } else {
      labels.push('square');
    }
    
    // Détecter le style
    if (isGrayscale) {
      labels.push('monochrome');
    } else if (isColorful) {
      labels.push('colorful');
    }
    
    // Détecter la complexité
    if (complexity > 0.7) {
      labels.push('complex');
    } else if (complexity < 0.3) {
      labels.push('simple');
    }
    
    // Détecter si c'est probablement un portrait
    if (this.isLikelyPortrait(imageData)) {
      labels.push('person');
    }
    
    // Détecter si c'est probablement de l'architecture
    if (this.isLikelyArchitecture(imageData)) {
      labels.push('architecture');
    }
    
    return labels.map(label => ({ description: label, score: 0.8 }));
  }
  
  // Détecter les objets basiques
  detectObjects(imageData) {
    const objects = [];
    
    // Détecter les formes géométriques
    if (this.hasRectangularShapes(imageData)) {
      objects.push({ name: 'rectangle', score: 0.7 });
    }
    
    if (this.hasCircularShapes(imageData)) {
      objects.push({ name: 'circle', score: 0.7 });
    }
    
    return objects;
  }
  
  // Analyser la composition
  analyzeComposition(imageData) {
    const { width, height } = imageData;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Analyser la règle des tiers
    const ruleOfThirds = this.analyzeRuleOfThirds(imageData);
    
    // Analyser la symétrie
    const symmetry = this.analyzeSymmetry(imageData);
    
    return {
      ruleOfThirds,
      symmetry,
      centerFocus: this.hasCenterFocus(imageData, centerX, centerY)
    };
  }
  
  // Analyser les couleurs
  analyzeColors(imageData) {
    const { data } = imageData;
    let r = 0, g = 0, b = 0;
    let grayscaleCount = 0;
    let colorfulCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];
      
      r += pixelR;
      g += pixelG;
      b += pixelB;
      
      // Vérifier si le pixel est en niveaux de gris
      const isGrayscale = Math.abs(pixelR - pixelG) < 10 && 
                         Math.abs(pixelG - pixelB) < 10 && 
                         Math.abs(pixelR - pixelB) < 10;
      
      if (isGrayscale) {
        grayscaleCount++;
      } else {
        colorfulCount++;
      }
    }
    
    const totalPixels = data.length / 4;
    const avgR = r / totalPixels;
    const avgG = g / totalPixels;
    const avgB = b / totalPixels;
    
    return {
      average: { r: avgR, g: avgG, b: avgB },
      isGrayscale: grayscaleCount / totalPixels > 0.8,
      isColorful: colorfulCount / totalPixels > 0.6,
      dominantColor: this.getDominantColor(avgR, avgG, avgB)
    };
  }

  parseGoogleResponse(response) {
    if (!response.responses || !response.responses[0]) {
      return { labels: [], objects: [], text: [] };
    }

    const data = response.responses[0];
    return {
      labels: data.labelAnnotations?.map(label => ({
        description: label.description,
        score: label.score
      })) || [],
      objects: data.localizedObjectAnnotations?.map(obj => ({
        name: obj.name,
        score: obj.score,
        boundingBox: obj.boundingPoly
      })) || [],
      text: data.textAnnotations?.map(text => ({
        description: text.description,
        score: text.score
      })) || []
    };
  }

  // Fonctions utilitaires pour l'analyse
  calculateComplexity(imageData) {
    const { data, width, height } = imageData;
    let totalVariation = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Comparer avec les pixels voisins
        const neighbors = [
          data[((y-1) * width + x) * 4],
          data[((y+1) * width + x) * 4],
          data[(y * width + (x-1)) * 4],
          data[(y * width + (x+1)) * 4]
        ];
        
        const avgNeighbor = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        totalVariation += Math.abs(center - avgNeighbor);
      }
    }
    
    return Math.min(totalVariation / (width * height * 255), 1);
  }
  
  isLikelyPortrait(imageData) {
    const { width, height } = imageData;
    const aspectRatio = width / height;
    
    // Portrait = ratio < 1
    return aspectRatio < 1 && this.hasCenterFocus(imageData, width/2, height/2);
  }
  
  isLikelyArchitecture(imageData) {
    const { width, height } = imageData;
    const aspectRatio = width / height;
    
    // Architecture = ratio > 1 et formes rectangulaires
    return aspectRatio > 1.2 && this.hasRectangularShapes(imageData);
  }
  
  hasRectangularShapes(imageData) {
    // Détection basique de lignes droites
    const { data, width, height } = imageData;
    let straightLines = 0;
    
    // Analyser les lignes horizontales et verticales
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width - 10; x += 10) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Vérifier la continuité horizontale
        let continuity = 0;
        for (let i = 0; i < 10; i++) {
          const nextIdx = (y * width + (x + i)) * 4;
          const nextBrightness = (data[nextIdx] + data[nextIdx + 1] + data[nextIdx + 2]) / 3;
          if (Math.abs(brightness - nextBrightness) < 20) continuity++;
        }
        
        if (continuity > 7) straightLines++;
      }
    }
    
    return straightLines > (width * height) / 1000;
  }
  
  hasCircularShapes(imageData) {
    // Détection basique de formes circulaires
    const { data, width, height } = imageData;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Vérifier la symétrie radiale
    let symmetricPixels = 0;
    const radius = Math.min(width, height) / 4;
    
    for (let angle = 0; angle < 360; angle += 10) {
      const x1 = centerX + Math.cos(angle * Math.PI / 180) * radius;
      const y1 = centerY + Math.sin(angle * Math.PI / 180) * radius;
      const x2 = centerX + Math.cos((angle + 180) * Math.PI / 180) * radius;
      const y2 = centerY + Math.sin((angle + 180) * Math.PI / 180) * radius;
      
      if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height &&
          x2 >= 0 && x2 < width && y2 >= 0 && y2 < height) {
        const idx1 = (Math.floor(y1) * width + Math.floor(x1)) * 4;
        const idx2 = (Math.floor(y2) * width + Math.floor(x2)) * 4;
        
        const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
        const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
        
        if (Math.abs(brightness1 - brightness2) < 30) symmetricPixels++;
      }
    }
    
    return symmetricPixels > 18; // Plus de 50% de symétrie
  }
  
  hasCenterFocus(imageData, centerX, centerY) {
    const { data, width, height } = imageData;
    const centerIdx = (Math.floor(centerY) * width + Math.floor(centerX)) * 4;
    const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;
    
    // Vérifier si le centre est plus lumineux que les bords
    let edgeBrightness = 0;
    const edgePixels = [
      [0, 0], [width-1, 0], [0, height-1], [width-1, height-1]
    ];
    
    for (const [x, y] of edgePixels) {
      const idx = (y * width + x) * 4;
      edgeBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }
    
    return centerBrightness > (edgeBrightness / edgePixels.length) + 20;
  }
  
  analyzeRuleOfThirds(imageData) {
    const { width, height } = imageData;
    const thirdX = width / 3;
    const thirdY = height / 3;
    
    // Analyser les points d'intersection de la règle des tiers
    const points = [
      [thirdX, thirdY],
      [thirdX * 2, thirdY],
      [thirdX, thirdY * 2],
      [thirdX * 2, thirdY * 2]
    ];
    
    let focusPoints = 0;
    for (const [x, y] of points) {
      if (this.hasCenterFocus(imageData, x, y)) {
        focusPoints++;
      }
    }
    
    return focusPoints / points.length;
  }
  
  analyzeSymmetry(imageData) {
    const { data, width, height } = imageData;
    let symmetricPixels = 0;
    let totalPixels = 0;
    
    // Vérifier la symétrie verticale
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width / 2; x++) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - 1 - x)) * 4;
        
        const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        
        if (Math.abs(leftBrightness - rightBrightness) < 30) {
          symmetricPixels++;
        }
        totalPixels++;
      }
    }
    
    return symmetricPixels / totalPixels;
  }
  
  getDominantColor(r, g, b) {
    if (r > g && r > b) return 'red';
    if (g > r && g > b) return 'green';
    if (b > r && b > g) return 'blue';
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return 'gray';
    return 'mixed';
  }

  // Détecter si les images sont compatibles
  areImagesCompatible(analysis1, analysis2) {
    if (!analysis1 || !analysis2) return false;

    // Vérifier les labels principaux
    const labels1 = analysis1.labels.map(l => l.description.toLowerCase());
    const labels2 = analysis2.labels.map(l => l.description.toLowerCase());

    // Types incompatibles
    const incompatibleTypes = [
      ['person', 'architecture'],
      ['person', 'landscape'],
      ['portrait', 'building'],
      ['monochrome', 'colorful']
    ];

    for (const [type1, type2] of incompatibleTypes) {
      if ((labels1.includes(type1) && labels2.includes(type2)) ||
          (labels1.includes(type2) && labels2.includes(type1))) {
        return false;
      }
    }

    return true;
  }

  // Calculer un score de similarité basé sur l'IA
  calculateSimilarityScore(analysis1, analysis2) {
    if (!this.areImagesCompatible(analysis1, analysis2)) {
      return { score: 5, reason: 'Images incompatibles selon l\'IA' };
    }

    // Logique de calcul basée sur les labels et objets
    const labels1 = analysis1.labels.map(l => l.description.toLowerCase());
    const labels2 = analysis2.labels.map(l => l.description.toLowerCase());
    
    const commonLabels = labels1.filter(label => labels2.includes(label));
    const similarity = (commonLabels.length / Math.max(labels1.length, labels2.length)) * 100;
    
    return {
      score: Math.round(similarity),
      reason: `Similarité basée sur ${commonLabels.length} labels communs`
    };
  }
}

// Instance par défaut (gratuite)
export const imageAnalysis = new ImageAnalysisService();
