# 🚀 Guide de déploiement - LaLumière

Ce guide explique comment déployer l'application LaLumière sur un VPS avec Docker Compose et GitHub Actions.

## 📋 Prérequis

### Sur votre VPS :
- Ubuntu 20.04+ ou Debian 10+
- Docker et Docker Compose installés
- Accès SSH configuré
- Un domaine pointant vers votre VPS (optionnel pour SSL)

### Sur GitHub :
- Repository configuré
- Secrets configurés (voir section Configuration)

## 🔧 Configuration

### 1. Secrets GitHub

Ajoutez ces secrets dans votre repository GitHub (Settings > Secrets and variables > Actions) :

```
VPS_HOST=votre-ip-vps
VPS_USER=votre-utilisateur-ssh
VPS_SSH_KEY=votre-clé-privée-ssh
```

### 2. Configuration VPS

```bash
# Sur votre VPS, créer le répertoire de déploiement
sudo mkdir -p /opt/lalumiere
sudo chown $USER:$USER /opt/lalumiere

# Cloner le repository
cd /opt
git clone https://github.com/votre-username/lalumiere.git
cd lalumiere
```

## 🐳 Déploiement avec Docker

### Déploiement basique (HTTP)

```bash
# Construire et démarrer l'application
docker-compose up -d --build

# Vérifier les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down
```

### Déploiement avec SSL (HTTPS)

```bash
# Configurer SSL (remplacer par votre domaine et email)
./setup-ssl.sh votre-domaine.com votre-email@example.com

# Démarrer avec SSL
docker-compose -f docker-compose-ssl.yml up -d --build
```

## 🔄 Déploiement automatique

### 1. Push vers main/master

Le workflow GitHub Actions se déclenche automatiquement :
- Tests de l'application
- Build de l'application
- Déploiement sur le VPS
- Vérification de santé

### 2. Déploiement manuel

```bash
# Sur le VPS
cd /opt/lalumiere
git pull origin main
./deploy.sh
```

## 📊 Monitoring

### Vérifier le statut

```bash
# Statut des conteneurs
docker-compose ps

# Logs de l'application
docker-compose logs lalumiere

# Logs de Nginx
docker-compose logs nginx

# Utilisation des ressources
docker stats
```

### Health check

```bash
# Vérifier que l'application répond
curl http://localhost:3000

# Avec SSL
curl https://votre-domaine.com
```

## 🔒 Sécurité

### Firewall

```bash
# Ouvrir les ports nécessaires
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### SSL automatique

Le certificat SSL se renouvelle automatiquement tous les jours à midi.

## 🛠️ Maintenance

### Mise à jour de l'application

```bash
# Sur le VPS
cd /opt/lalumiere
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Sauvegarde

Les sauvegardes sont automatiquement créées dans `/opt/backups/lalumiere/` avant chaque déploiement.

### Nettoyage

```bash
# Nettoyer les images Docker inutilisées
docker system prune -f

# Nettoyer les volumes inutilisés
docker volume prune -f
```

## 🐛 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs

# Redémarrer les conteneurs
docker-compose restart

# Reconstruire complètement
docker-compose down
docker-compose up -d --build --force-recreate
```

### Problème de permissions

```bash
# Corriger les permissions
sudo chown -R $USER:$USER /opt/lalumiere
```

### Problème de SSL

```bash
# Vérifier les certificats
ls -la ssl/live/votre-domaine.com/

# Renouveler manuellement
docker run --rm -v $(pwd)/ssl:/etc/letsencrypt certbot/certbot renew
```

## 📞 Support

En cas de problème :
1. Vérifiez les logs : `docker-compose logs`
2. Vérifiez le statut : `docker-compose ps`
3. Consultez la documentation Docker
4. Ouvrez une issue sur GitHub

---

**Note** : Remplacez `votre-domaine.com`, `votre-email@example.com`, et `votre-ip-vps` par vos vraies valeurs.
