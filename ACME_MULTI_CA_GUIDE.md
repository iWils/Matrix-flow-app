# Guide ACME Multi-CA pour Matrix Flow

Matrix Flow supporte nativement plusieurs fournisseurs ACME pour l'obtention automatique de certificats SSL/TLS.

## 🏢 Autorités de Certification Supportées

| CA | Description | Gratuit | Commercial | Commande |
|---|---|---|---|---|
| **Let's Encrypt** | CA le plus populaire | ✅ | ❌ | `make acme-letsencrypt` |
| **ZeroSSL** | Alternative avec fonctionnalités pro | ✅ | ✅ | `make acme-zerossl` |
| **Buypass** | CA norvégien, alternative EU | ✅ | ❌ | `make acme-buypass` |
| **Google Trust Services** | Nouveau CA de Google (Beta) | ✅ | ❌ | `make acme-google` |
| **SSL.com** | CA commercial avec support étendu | ❌ | ✅ | Configuration manuelle |
| **Step-CA** | Autorité de certification privée | ✅ | ✅ | `make acme-step-ca` |

## 🚀 Configuration Rapide

### 1. Let's Encrypt (Recommandé)
```bash
# Dans votre .env
ENABLE_HTTPS=true
ACME_CA_SERVER=letsencrypt
ACME_EMAIL=admin@votre-domaine.com
DOMAIN=votre-domaine.com

# Démarrer l'application
make up

# Configurer ACME
make acme-letsencrypt
```

### 2. ZeroSSL (Alternative populaire)
```bash
# Configuration
ACME_CA_SERVER=zerossl
ACME_EMAIL=admin@votre-domaine.com
ZEROSSL_API_KEY=your-api-key  # Optionnel

make acme-zerossl
```

### 3. Buypass (Alternative européenne)
```bash
# Configuration
ACME_CA_SERVER=buypass
ACME_EMAIL=admin@votre-domaine.com

make acme-buypass
```

### 4. Google Trust Services (Nouveau)
```bash
# Configuration
ACME_CA_SERVER=google
ACME_EMAIL=admin@votre-domaine.com

make acme-google
```

### 5. Step-CA (CA Privée)
```bash
# Configuration
ACME_CA_SERVER=step-ca
ACME_EMAIL=admin@votre-domaine.com
STEP_CA_URL=https://ca.example.com:9000
STEP_CA_ROOT=fingerprint-du-certificat-racine
STEP_CA_PROVISIONER=acme

make acme-step-ca
```

## 🔧 Configuration Avancée

### Variables d'environnement ACME

```env
# Serveur CA (letsencrypt, zerossl, buypass, google, ssl.com, step-ca)
ACME_CA_SERVER=letsencrypt

# Email de contact
ACME_EMAIL=admin@example.com

# Méthode de validation
CHALLENGE_METHOD=http  # http, dns, standalone, alpn

# Fournisseur DNS (pour validation DNS)
DNS_PROVIDER=dns_cf    # Voir liste complète ci-dessous

# Taille de clé SSL
SSL_KEY_SIZE=4096      # 2048, 3072, 4096, ec-256, ec-384

# Variables Step-CA (si ACME_CA_SERVER=step-ca)
STEP_CA_URL=https://ca.example.com:9000
STEP_CA_ROOT=fingerprint-certificat-racine
STEP_CA_PROVISIONER=acme
STEP_CA_PASSWORD=mot-de-passe-provisionneur  # Optionnel
```

### Méthodes de validation

#### 1. HTTP Challenge (défaut)
```env
CHALLENGE_METHOD=http
```
- Requiert port 80 accessible
- Fichier de validation placé dans webroot
- Le plus simple pour la plupart des cas

#### 2. DNS Challenge
```env
CHALLENGE_METHOD=dns
DNS_PROVIDER=dns_cf  # Voir liste des providers
```
- Permet les certificats wildcard
- Fonctionne derrière firewall/NAT
- Requiert API DNS

#### 3. Standalone Challenge
```env
CHALLENGE_METHOD=standalone
```
- acme.sh démarre son propre serveur
- Requiert port 80 libre
- Bon pour serveurs dédiés

#### 4. ALPN Challenge
```env
CHALLENGE_METHOD=alpn
```
- Utilise port 443
- Plus rapide que HTTP
- Requiert TLS-ALPN-01

## 🌐 Fournisseurs DNS Supportés

acme.sh supporte 100+ fournisseurs DNS :

### Populaires
| Provider | Variable | Documentation |
|----------|----------|---------------|
| Cloudflare | `dns_cf` | [Guide CF](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_cf) |
| OVH | `dns_ovh` | [Guide OVH](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_ovh) |
| Gandi | `dns_gandi_livedns` | [Guide Gandi](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_gandi_livedns) |
| Route53 | `dns_aws` | [Guide AWS](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_aws) |
| Google Cloud | `dns_gcloud` | [Guide GCP](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_gcloud) |
| Azure | `dns_azure` | [Guide Azure](https://github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_azure) |

### Configuration DNS Examples

#### Cloudflare
```env
DNS_PROVIDER=dns_cf
CF_Email=your@email.com
CF_Key=your-api-key
# ou Global API Key:
CF_Token=your-token
```

#### OVH
```env
DNS_PROVIDER=dns_ovh
OVH_AK=your-application-key
OVH_AS=your-application-secret
OVH_CK=your-consumer-key
```

#### Route53 (AWS)
```env
DNS_PROVIDER=dns_aws
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 🔑 Configuration pour CAs Commerciaux

### ZeroSSL
```env
ACME_CA_SERVER=zerossl
ZEROSSL_API_KEY=your-zerossl-api-key
```
- API Key optionnelle mais recommandée
- Fonctionnalités avancées disponibles
- Dashboard web pour gestion

### SSL.com
```env
ACME_CA_SERVER=ssl.com
SSLCOM_API_KEY=your-api-key
SSLCOM_API_SECRET=your-api-secret
```
- Requiert compte payant
- Support étendu (EV, OV certificates)
- Conformité haute sécurité

### Step-CA (Autorité de Certification Privée)
```env
ACME_CA_SERVER=step-ca
STEP_CA_URL=https://ca.example.com:9000
STEP_CA_ROOT=fingerprint-du-certificat-racine
STEP_CA_PROVISIONER=acme
STEP_CA_PASSWORD=mot-de-passe-provisionneur  # Optionnel
```

**Avantages**:
- Infrastructure PKI privée complète
- Contrôle total sur l'autorité de certification
- Idéal pour environnements internes/entreprise
- Support des certificats de courte durée
- Rotation automatique des certificats

**Prérequis**: 
- Serveur Step-CA configuré et accessible
- Provisionneur ACME activé sur Step-CA
- Fingerprint du certificat racine disponible

**Configuration Step-CA**:
```bash
# Sur le serveur Step-CA, activer le provisionneur ACME
step ca provisioner add acme --type ACME

# Récupérer le fingerprint
step certificate fingerprint root_ca.crt
```

## 🔄 Renouvellement Automatique

Le renouvellement est automatiquement configuré :

```bash
# Vérifier le statut des certificats
docker exec matrix-flow-web acme.sh --list

# Forcer le renouvellement
docker exec matrix-flow-web acme.sh --renew -d votre-domaine.com --force

# Vérifier la crontab
docker exec matrix-flow-web crontab -l
```

### Hook de post-renouvellement
```bash
# Le container redémarre automatiquement après renouvellement
# Script: /usr/local/bin/matrix-flow-reload.sh
```

## 🚨 Dépannage

### Certificat non émis
```bash
# Vérifier les logs
docker logs matrix-flow-web

# Debug mode
docker exec matrix-flow-web acme.sh --issue -d domain.com --debug
```

### Validation échouée
```bash
# Vérifier connectivité
curl -I http://votre-domaine.com/.well-known/acme-challenge/test

# Vérifier DNS (pour validation DNS)
dig TXT _acme-challenge.votre-domaine.com
```

### Limites de rate limiting

| CA | Limite | Fenêtre |
|----|--------|---------|
| Let's Encrypt | 50 certificats/semaine | 7 jours |
| ZeroSSL | 3 certificats/jour | 24h |
| Buypass | 5 certificats/jour | 24h |
| Google | Variables | Variables |

## 📋 Exemples Complets

### Production avec Cloudflare DNS
```env
ENABLE_HTTPS=true
ACME_CA_SERVER=letsencrypt
ACME_EMAIL=admin@example.com
DOMAIN=example.com
CHALLENGE_METHOD=dns
DNS_PROVIDER=dns_cf
CF_Token=your-cloudflare-token
SSL_KEY_SIZE=4096
```

### Staging/Test avec ZeroSSL
```env
ENABLE_HTTPS=true
ACME_CA_SERVER=zerossl
ACME_EMAIL=test@example.com
DOMAIN=staging.example.com
CHALLENGE_METHOD=http
SSL_KEY_SIZE=ec-256
```

### Haute sécurité avec SSL.com
```env
ENABLE_HTTPS=true
ACME_CA_SERVER=ssl.com
ACME_EMAIL=security@example.com
DOMAIN=secure.example.com
CHALLENGE_METHOD=dns
DNS_PROVIDER=dns_aws
SSL_KEY_SIZE=4096
SSLCOM_API_KEY=your-key
```

### Infrastructure privée avec Step-CA
```env
ENABLE_HTTPS=true
ACME_CA_SERVER=step-ca
ACME_EMAIL=admin@internal.company.com
DOMAIN=app.internal.company.com
STEP_CA_URL=https://ca.internal.company.com:9000
STEP_CA_ROOT=a1b2c3d4e5f6...
STEP_CA_PROVISIONER=acme
SSL_KEY_SIZE=4096
```

## 🔗 Liens Utiles

- [acme.sh Wiki](https://github.com/acmesh-official/acme.sh/wiki)
- [Liste complète DNS API](https://github.com/acmesh-official/acme.sh/wiki/dnsapi)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [ZeroSSL Documentation](https://zerossl.com/documentation/)
- [Buypass ACME](https://www.buypass.com/ssl/products/acme)
- [Step-CA Documentation](https://smallstep.com/docs/step-ca/)
- [Step-CA ACME Provisioner](https://smallstep.com/docs/step-ca/provisioners#acme)

## ⚡ TL;DR - Configuration Ultra Rapide

```bash
# 1. Configurer dans .env
ENABLE_HTTPS=true
ACME_CA_SERVER=letsencrypt  # ou zerossl, buypass, google, step-ca
ACME_EMAIL=admin@votre-domaine.com

# 2. Démarrer
make up

# 3. Configurer ACME 
make acme-letsencrypt  # ou acme-zerossl, acme-buypass, etc.

# 4. Vérifier
curl -I https://votre-domaine.com
```

**Matrix Flow vous offre une flexibilité totale pour choisir votre CA préféré !** 🎉