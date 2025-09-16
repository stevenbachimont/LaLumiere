#!/bin/bash

# Script de configuration SSL avec Let's Encrypt
set -e

echo "🔒 Configuration SSL pour LaLumière..."

# Variables
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"your-email@example.com"}

if [ "$DOMAIN" = "your-domain.com" ]; then
    echo "❌ Veuillez spécifier votre domaine :"
    echo "Usage: ./setup-ssl.sh your-domain.com your-email@example.com"
    exit 1
fi

# Créer le répertoire SSL
mkdir -p ssl

# Mettre à jour la configuration Nginx pour SSL
cat > nginx-ssl.conf << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name $DOMAIN;
        return 301 https://\$server_name\$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/$DOMAIN/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Root directory
        root /usr/share/nginx/html;
        index index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle SvelteKit routes
        location / {
            try_files \$uri \$uri/ @sveltekit;
        }

        location @sveltekit {
            proxy_pass http://lalumiere:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://lalumiere:3000;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

# Obtenir le certificat SSL
echo "🔐 Obtention du certificat SSL pour $DOMAIN..."
docker run --rm \
  -v $(pwd)/ssl:/etc/letsencrypt \
  -v $(pwd)/static:/var/www/html \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/html \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN

# Mettre à jour docker-compose.yml pour SSL
cat > docker-compose-ssl.yml << EOF
version: '3.8'

services:
  lalumiere:
    build: .
    container_name: lalumiere-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./static:/usr/share/nginx/html/static:ro
    networks:
      - lalumiere-network

  nginx:
    image: nginx:alpine
    container_name: lalumiere-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - ./static:/usr/share/nginx/html/static:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - lalumiere
    networks:
      - lalumiere-network

  # Service pour le renouvellement automatique des certificats
  certbot-renew:
    image: certbot/certbot
    container_name: lalumiere-certbot-renew
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./static:/var/www/html:ro
    command: renew --webroot --webroot-path=/var/www/html
    restart: "0 0 12 * * ?" # Renouveler tous les jours à midi

networks:
  lalumiere-network:
    driver: bridge
EOF

echo "✅ Configuration SSL terminée !"
echo "🔧 Pour activer SSL, utilisez : docker-compose -f docker-compose-ssl.yml up -d"
echo "🌐 Votre site sera accessible sur https://$DOMAIN"
