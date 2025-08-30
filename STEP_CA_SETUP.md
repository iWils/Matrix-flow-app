# Guide Step-CA pour Matrix Flow

Matrix Flow supporte nativement **Step-CA** comme autorité de certification privée.

## 🏠 À propos de Step-CA

Step-CA est une autorité de certification moderne conçue pour les environnements cloud et les infrastructures DevOps :

- **PKI moderne** : Certificats X.509 et SSH
- **Certificats à courte durée** : Sécurité renforcée par rotation fréquente  
- **API-First** : Intégration native dans les pipelines CI/CD
- **Multi-provisionneur** : Support ACME, OAuth, SSH, etc.
- **Open Source** : Code source disponible et auditable

## 🚀 Configuration Rapide

### 1. Prérequis Step-CA

Votre serveur Step-CA doit être configuré avec un provisionneur ACME :

```bash
# Sur le serveur Step-CA
step ca provisioner add acme --type ACME --require-eab=false
```

### 2. Configuration Matrix Flow

Dans votre `.env` :

```env
# Configuration HTTPS
ENABLE_HTTPS=true
ACME_CA_SERVER=step-ca
ACME_EMAIL=admin@votre-domaine.com
DOMAIN=votre-domaine.com

# Configuration Step-CA
STEP_CA_URL=https://ca.example.com:9000
STEP_CA_ROOT=a1b2c3d4e5f6789...  # Fingerprint du certificat racine
STEP_CA_PROVISIONER=acme
STEP_CA_PASSWORD=mot-de-passe    # Optionnel
```

### 3. Obtenir le fingerprint

```bash
# Sur le serveur Step-CA ou avec accès au certificat racine
step certificate fingerprint /etc/step-ca/certs/root_ca.crt
```

### 4. Démarrage

```bash
# Démarrer Matrix Flow
make up

# Configurer Step-CA et émettre le certificat
make acme-step-ca
```

## 🔧 Configuration Avancée

### Variables d'environnement Step-CA

```env
# URL complète du serveur Step-CA (requis)
STEP_CA_URL=https://ca.internal.company.com:9000

# Fingerprint du certificat racine Step-CA (requis)
# Obtenu avec: step certificate fingerprint root_ca.crt
STEP_CA_ROOT=your-root-ca-fingerprint

# Nom du provisionneur ACME configuré sur Step-CA (requis)
STEP_CA_PROVISIONER=acme

# Mot de passe du provisionneur (optionnel)
# Utilisé si le provisionneur requiert une authentification
STEP_CA_PASSWORD=your-provisioner-password

# Taille de clé SSL
SSL_KEY_SIZE=4096
```

### Configuration du serveur Step-CA

```bash
# Initialiser Step-CA
step ca init --deployment-type=standalone

# Démarrer le serveur CA
step-ca $(step path)/config/ca.json

# Ajouter un provisionneur ACME
step ca provisioner add "Matrix Flow ACME" \
    --type ACME \
    --require-eab=false

# Optionnel : Configurer des contraintes de noms
step ca provisioner add "Matrix Flow ACME" \
    --type ACME \
    --require-eab=false \
    --x509-template=templates/leaf.tpl \
    --ssh-template=templates/ssh.tpl
```

## 📋 Exemples d'usage

### Infrastructure interne d'entreprise

```env
ENABLE_HTTPS=true
ACME_CA_SERVER=step-ca
DOMAIN=matrix.internal.company.com
STEP_CA_URL=https://pki.internal.company.com:9000
STEP_CA_ROOT=f1e2d3c4b5a67890...
STEP_CA_PROVISIONER=internal-services
```

### Environnement de développement

```env
ENABLE_HTTPS=true
ACME_CA_SERVER=step-ca  
DOMAIN=matrix.dev.local
STEP_CA_URL=https://ca.dev.local:9000
STEP_CA_ROOT=a1b2c3d4e5f6...
STEP_CA_PROVISIONER=dev-acme
SSL_KEY_SIZE=2048
```

### Kubernetes avec Step-CA

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: matrix-flow-config
data:
  ENABLE_HTTPS: "true"
  ACME_CA_SERVER: "step-ca"
  STEP_CA_URL: "https://step-ca.step-ca.svc.cluster.local:9000"
  STEP_CA_ROOT: "your-cluster-ca-fingerprint"
  STEP_CA_PROVISIONER: "k8s-acme"
```

## 🔄 Renouvellement automatique

Step-CA gère automatiquement le renouvellement des certificats :

```bash
# Vérifier le statut du certificat
step certificate inspect /app/ssl/cert.pem

# Renouveler manuellement si nécessaire
step ca renew /app/ssl/cert.pem /app/ssl/key.pem --force
```

## 🚨 Dépannage

### Erreur de connexion Step-CA

```bash
# Vérifier la connectivité
curl -k https://ca.example.com:9000/health

# Tester l'accès ACME
curl -k https://ca.example.com:9000/acme/acme/directory
```

### Problème de certificat racine

```bash
# Télécharger le certificat racine
step ca root --ca-url=https://ca.example.com:9000

# Vérifier le fingerprint
step certificate fingerprint root_ca.crt
```

### Provisionneur introuvable

```bash
# Lister les provisionneurs disponibles
step ca provisioner list --ca-url=https://ca.example.com:9000

# Vérifier la configuration ACME
step ca provisioner list --ca-url=https://ca.example.com:9000 | grep ACME
```

## 🔐 Sécurité

### Bonnes pratiques

1. **Certificats courte durée** : Step-CA favorise les certificats de 24h par défaut
2. **Rotation automatique** : Matrix Flow renouvelle automatiquement les certificats
3. **Isolation réseau** : Hébergez Step-CA sur un réseau privé sécurisé
4. **Authentification** : Utilisez des provisionneurs avec authentification si possible
5. **Monitoring** : Surveillez les logs de Step-CA pour détecter les activités suspectes

### Template de configuration sécurisée

```bash
# Configuration Step-CA avec sécurité renforcée
step ca provisioner add "matrix-flow-secure" \
    --type ACME \
    --require-eab=true \
    --x509-max-dur=24h \
    --x509-default-dur=12h
```

## 🔗 Liens utiles

- [Documentation Step-CA](https://smallstep.com/docs/step-ca/)
- [Provisionneurs ACME](https://smallstep.com/docs/step-ca/provisioners#acme)
- [Templates de certificats](https://smallstep.com/docs/step-ca/templates)
- [GitHub Step-CA](https://github.com/smallstep/certificates)
- [Certificat SSH](https://smallstep.com/docs/step-ca/provisioners#ssh)

---

**Matrix Flow + Step-CA = Infrastructure PKI moderne et sécurisée ! 🏠🔒**