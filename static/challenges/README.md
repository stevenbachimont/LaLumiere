# 📸 Challenges de Cadrage

Ce dossier contient les images de référence pour les challenges de cadrage de l'application La Lumière.

## 📁 Structure des dossiers

```
static/challenges/
├── cadrages/
│   ├── commerce/           # Challenge de cadrage commercial
│   │   ├── reference-image.svg      # Formes géométriques simples
│   │   ├── reference-image-2.svg    # Formes organiques
│   │   ├── reference-image-3.svg    # Composition complexe
│   │   └── commerce.jpg             # Photo réelle de commerce
│   └── [autres-types]/     # Futurs types de challenges
└── README.md              # Ce fichier
```

## 🎯 Types de challenges

### Commerce
- **Objectif** : Apprendre à cadrer des scènes commerciales
- **Images** : 4 images de référence (3 SVG + 1 JPG)
- **Difficulté** : Moyen
- **Durée** : 15 minutes

## 🖼️ Formats d'images

### SVG (Scalable Vector Graphics)
- **Avantages** : Redimensionnable sans perte, léger, parfait pour les overlays
- **Usage** : Formes géométriques, guides de cadrage
- **Taille recommandée** : 640x480px

### JPG (JPEG)
- **Avantages** : Photos réalistes, compression optimisée
- **Usage** : Images de référence réelles
- **Taille recommandée** : 640x480px ou plus

## 🔧 Utilisation technique

Les images sont chargées dynamiquement dans le composant `CadrerChallenge.svelte` :

```javascript
const challengeTypes = {
    commerce: {
        name: 'Commerce',
        images: [
            '/challenges/cadrages/commerce/reference-image.svg',
            '/challenges/cadrages/commerce/reference-image-2.svg',
            '/challenges/cadrages/commerce/reference-image-3.svg',
            '/challenges/cadrages/commerce/commerce.jpg'
        ]
    }
};
```

## 📝 Ajout de nouveaux challenges

1. Créer un nouveau dossier dans `cadrages/`
2. Ajouter les images de référence
3. Mettre à jour `challengeTypes` dans `CadrerChallenge.svelte`
4. Tester le nouveau challenge

## 🎨 Conseils pour les images de référence

- **Contraste** : Assurez-vous que les éléments sont bien visibles
- **Simplicité** : Évitez les détails trop complexes
- **Cohérence** : Gardez un style visuel cohérent
- **Accessibilité** : Vérifiez la lisibilité sur différents écrans
