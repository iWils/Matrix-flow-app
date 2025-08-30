# Guide HTTPS pour Matrix Flow

Cette application supporte nativement HTTPS avec un seul `docker-compose.yml` et des variables d'environnement.

## 🚀 Démarrage rapide HTTPS

### Option 1: Certificats auto-signés (Développement)
```bash
make https
```
L'application génère automatiquement des certificats auto-signés et démarre sur https://localhost

⚠️ **Note**: Votre navigateur affichera un avertissement de sécurité - cliquez sur "Avancé" et "Continuer vers localhost"

### Option 2: Certificats personnalisés
```bash
# 1. Générer des certificats de développement
make ssl-dev

# 2. Ou copier vos propres certificats dans ./ssl/
# Les fichiers attendus sont: key.pem et cert.pem

# 3. Démarrer avec certificats personnalisés  
make https-custom
```

### Option 3: Configuration manuelle via .env
```bash
# 1. Copier et éditer le fichier d'environnement
cp .env.example .env

# 2. Modifier les variables HTTPS dans .env:
ENABLE_HTTPS=true
NEXTAUTH_URL=https://localhost
NEXT_PUBLIC_APP_URL=https://localhost
HTTP_PORT=80

# 3. Démarrer normalement
make up
```

## 📋 Configuration détaillée

### Variables d'environnement HTTPS

| Variable | Défaut | Description |
|----------|---------|-------------|
| `ENABLE_HTTPS` | `false` | Active le serveur HTTPS |
| `HTTPS_PORT` | `443` | Port HTTPS d'écoute |
| `HTTP_PORT` | `3000` | Port HTTP d'écoute |
| `GENERATE_SELF_SIGNED` | `true` | Génère des certificats auto-signés si aucun trouvé |
| `FORCE_HTTPS` | `true` | Redirige automatiquement HTTP vers HTTPS |
| `SSL_CERTS_PATH` | `./ssl` | Chemin vers les certificats personnalisés |

### Chemins des certificats supportés

L'application recherche les certificats dans cet ordre :

1. **Certificats personnalisés**:
   - `/app/ssl/key.pem` et `/app/ssl/cert.pem`
   - `./ssl/key.pem` et `./ssl/cert.pem`

2. **Let's Encrypt**:
   - `/etc/letsencrypt/live/domain/privkey.pem`
   - `/etc/letsencrypt/live/domain/fullchain.pem`

3. **Génération automatique**: Si aucun certificat n'est trouvé et `GENERATE_SELF_SIGNED=true`

## 🐳 Configurations Docker Compose

### Mode HTTPS avec certificats personnalisés

```yaml
# docker-compose.override.yml
services:
  web:
    environment:
      - ENABLE_HTTPS=true
      - NEXTAUTH_URL=https://votre-domaine.com
      - NEXT_PUBLIC_APP_URL=https://votre-domaine.com
    ports:
      - "80:3000"
      - "443:443"
    volumes:
      - ./ssl:/app/ssl:ro
```

### Avec Let's Encrypt

```yaml
services:
  web:
    environment:
      - ENABLE_HTTPS=true
      - GENERATE_SELF_SIGNED=false
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

## 🔒 Production avec certificats valides

### Option 1: Let's Encrypt avec Certbot

```bash
# 1. Installer certbot
sudo apt install certbot

# 2. Obtenir les certificats
sudo certbot certonly --standalone -d votre-domaine.com

# 3. Monter les certificats dans Docker
docker run -d \
  -p 80:3000 \
  -p 443:443 \
  -e ENABLE_HTTPS=true \
  -e NEXTAUTH_URL=https://votre-domaine.com \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  matrix-flow-web
```

### Option 2: Certificats d'une CA

```bash
# 1. Placez vos certificats dans ./ssl/
cp your-cert.pem ./ssl/cert.pem
cp your-key.pem ./ssl/key.pem

# 2. Démarrer l'application
make https-custom
```

## 🔧 Intégration avec des Reverse Proxy

### Traefik

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.httpsChallenge=true
    ports:
      - "80:80"
      - "443:443"

  web:
    environment:
      - ENABLE_HTTPS=false  # Traefik gère HTTPS
      - FORCE_HTTPS=false
      - NEXTAUTH_URL=https://votre-domaine.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`votre-domaine.com`)"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
    expose:
      - "3000"
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Avec Nginx, configurez l'application :
```bash
docker run -d \
  -p 3000:3000 \
  -e ENABLE_HTTPS=false \
  -e FORCE_HTTPS=false \
  -e NEXTAUTH_URL=https://votre-domaine.com \
  matrix-flow-web
```

## 🚨 Dépannage

### Erreur "EADDRINUSE" sur le port 443
```bash
# Vérifier quel processus utilise le port
sudo netstat -tulpn | grep :443

# Ou avec ss
sudo ss -tulpn | grep :443
```

### Certificats non trouvés
```bash
# Vérifier les permissions
ls -la ssl/
docker exec container_name ls -la /app/ssl/

# Vérifier les logs
docker logs container_name
```

### Redirection HTTP non fonctionnelle
Vérifiez que `FORCE_HTTPS=true` et que l'application écoute bien sur les deux ports.

## 📝 Notes de sécurité

- **Développement**: Les certificats auto-signés sont parfaits
- **Production**: Utilisez toujours des certificats d'une CA reconnue
- **Let's Encrypt**: Gratuit et automatiquement renouvelable
- **Permissions**: Les certificats doivent être lisibles par l'utilisateur `nextjs` (UID 1001)

## 🔄 Renouvellement automatique (Let's Encrypt)

Créez un cron job pour renouveler automatiquement :

```bash
# /etc/cron.d/certbot-renew
0 12 * * * root certbot renew --quiet && docker restart matrix-flow-web
```