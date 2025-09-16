# Dockerfile pour LaLumière - Production
FROM node:18-alpine AS builder

# Installer les dépendances système
RUN apk add --no-cache git

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Construire l'application SvelteKit
RUN npm run build

# Image de production avec Nginx
FROM nginx:alpine

# Installer Node.js pour le serveur SvelteKit
RUN apk add --no-cache nodejs npm

# Copier les fichiers construits
COPY --from=builder /app/build /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copier le package.json pour les dépendances de production
COPY --from=builder /app/package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production

# Exposer le port 3000 pour SvelteKit
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
