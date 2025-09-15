# La Lumière - Application Mobile

Une application mobile moderne développée avec SvelteKit, optimisée pour les smartphones et installable comme une PWA (Progressive Web App).

## 🚀 Fonctionnalités

- **Design Mobile-First** : Interface optimisée pour les smartphones
- **PWA** : Installable comme une application native
- **Responsive** : S'adapte à tous les écrans
- **Performance** : Rapide et fluide grâce à SvelteKit
- **Offline** : Fonctionne même sans connexion internet
- **Composants Réutilisables** : Architecture modulaire

## 🛠️ Technologies Utilisées

- **SvelteKit** : Framework web moderne
- **TypeScript** : Typage statique
- **PWA** : Service Worker et Manifest
- **CSS Grid/Flexbox** : Layout responsive
- **Workbox** : Gestion du cache

## 📱 Installation

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd app-mobile
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir dans le navigateur**
   - Accédez à `http://localhost:5173`
   - Utilisez les outils de développement pour simuler un mobile

## 🏗️ Structure du Projet

```
src/
├── lib/
│   ├── components/          # Composants réutilisables
│   │   ├── MobileButton.svelte
│   │   ├── MobileCard.svelte
│   │   ├── MobileNav.svelte
│   │   └── index.ts
│   ├── sw-register.ts       # Enregistrement du Service Worker
│   └── assets/              # Assets statiques
├── routes/                  # Pages de l'application
│   ├── +layout.svelte      # Layout principal
│   └── +page.svelte        # Page d'accueil
└── app.html                # Template HTML principal
```

## 🎨 Composants Disponibles

### MobileButton
Bouton mobile avec plusieurs variantes et tailles.

```svelte
<MobileButton variant="primary" size="lg" icon="🚀">
  Mon Bouton
</MobileButton>
```

**Props :**
- `variant` : 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size` : 'sm' | 'md' | 'lg'
- `disabled` : boolean
- `loading` : boolean
- `icon` : string

### MobileCard
Carte mobile avec support pour images, icônes et contenu.

```svelte
<MobileCard
  title="Mon Titre"
  subtitle="Sous-titre"
  icon="📱"
  clickable={true}
>
  Contenu de la carte
</MobileCard>
```

**Props :**
- `title` : string
- `subtitle` : string
- `icon` : string
- `image` : string
- `clickable` : boolean

### MobileNav
Navigation mobile avec menu hamburger.

```svelte
<MobileNav />
```

## 📦 Build et Déploiement

1. **Build de production**
   ```bash
   npm run build
   ```

2. **Prévisualiser le build**
   ```bash
   npm run preview
   ```

3. **Déployer**
   - Le dossier `build` contient les fichiers statiques
   - Déployez sur n'importe quel serveur web

## 🔧 Configuration PWA

L'application est configurée comme une PWA avec :

- **Manifest** : `/static/manifest.json`
- **Service Worker** : `/static/sw.js`
- **Icônes** : `/static/icon-*.svg`

## 📱 Installation sur Mobile

1. Ouvrez l'application dans Chrome/Safari mobile
2. Appuyez sur "Installer l'application" (si disponible)
3. Ou utilisez le menu "Ajouter à l'écran d'accueil"

## 🎯 Prochaines Étapes

- [ ] Ajouter des pages supplémentaires
- [ ] Implémenter la navigation entre pages
- [ ] Ajouter des animations
- [ ] Intégrer une base de données
- [ ] Ajouter l'authentification
- [ ] Implémenter les notifications push

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

Développé avec ❤️ en SvelteKit# LaLumiere
