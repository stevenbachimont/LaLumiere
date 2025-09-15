# Images de référence pour le challenge CADRER

## 📁 Structure des fichiers

Les images de référence sont stockées dans le dossier `static/` pour être accessibles directement via URL.

### Images disponibles :
- `reference-image.svg` - Formes géométriques de base (rectangles, cercles)
- `reference-image-2.svg` - Formes plus complexes (triangles, ellipses)
- `reference-image-3.svg` - Formes organiques et asymétriques

## 🎨 Format des images

- **Dimensions** : 640x480 pixels (format 4:3)
- **Format** : SVG (Scalable Vector Graphics)
- **Couleurs** : Couleurs vives avec opacité pour la superposition
- **Guides** : Lignes de cadrage (règle des tiers) intégrées

## 🔧 Utilisation

Les images sont chargées dynamiquement dans le composant `CadrerChallenge.svelte` :

```javascript
const referenceImages = [
    '/reference-image.svg',
    '/reference-image-2.svg', 
    '/reference-image-3.svg'
];
```

## ✨ Fonctionnalités

- **Changement d'image** : Boutons "Précédente" et "Suivante"
- **Transparence ajustable** : Slider de 10% à 100%
- **Affichage conditionnel** : Checkbox pour activer/désactiver l'overlay
- **Compteur** : Affichage "1 / 3" pour indiquer la position

## 🎯 Objectif du challenge

L'utilisateur doit recréer exactement le cadrage de l'image de référence en :
1. Positionnant correctement les formes
2. Respectant les proportions
3. Alignant avec les guides de cadrage
4. Capturant la photo au bon moment
