#!/bin/bash

# Script de déploiement pour LaLumière
set -e

echo "🚀 Démarrage du déploiement de LaLumière..."

# Variables
APP_NAME="lalumiere"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/backups/lalumiere"

# Créer le répertoire de backup s'il n'existe pas
mkdir -p $BACKUP_DIR

# Sauvegarder l'ancienne version si elle existe
if [ -d "/opt/$APP_NAME" ]; then
    echo "📦 Sauvegarde de l'ancienne version..."
    tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C /opt $APP_NAME
fi

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose -f $DOCKER_COMPOSE_FILE down || true

# Nettoyer les images inutilisées
echo "🧹 Nettoyage des images Docker..."
docker system prune -f

# Construire et démarrer les nouveaux conteneurs
echo "🔨 Construction et démarrage des nouveaux conteneurs..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d --build

# Attendre que l'application soit prête
echo "⏳ Attente du démarrage de l'application..."
sleep 30

# Vérifier que l'application répond
echo "🔍 Vérification de l'application..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application déployée avec succès !"
    echo "🌐 Application accessible sur http://localhost:3000"
else
    echo "❌ Erreur lors du déploiement - l'application ne répond pas"
    exit 1
fi

# Afficher les logs
echo "📋 Logs de l'application :"
docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=50

echo "🎉 Déploiement terminé !"
