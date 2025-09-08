# 🌐 Matrix Flow

> Application web moderne de gestion de matrices de flux réseau avec système de versioning, audit et contrôle d'accès granulaire.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.3-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![HTTPS](https://img.shields.io/badge/HTTPS-Native-green?logo=letsencrypt)](https://github.com)

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture technique](#-architecture-technique)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [API](#-api)
- [Déploiement](#-déploiement)
- [Développement](#-développement)
- [Sécurité](#-sécurité)
- [Contribution](#-contribution)
- [Licence](#-licence)

## 🎯 Vue d'ensemble

Matrix Flow est une application web complète pour gérer les matrices de flux réseau dans les environnements d'entreprise. Elle permet de documenter, versionner et auditer les règles de flux réseau entre différentes zones de sécurité.

### Cas d'usage principaux

- **Gestion des règles firewall** : Documentez et suivez les règles de flux entre zones réseau
- **Audit et conformité** : Traçabilité complète des modifications avec historique
- **Collaboration d'équipe** : Système de permissions et workflow d'approbation
- **Import/Export** : Support CSV pour intégration avec outils existants
- **Versioning** : Snapshots et historique des versions de matrices

## 🚀 État du Projet - Phase 3 (75% Complétée)

### ✅ Phase 1 - Core Platform (100%)
- ✅ Authentification NextAuth.js avec RBAC
- ✅ CRUD complet des matrices et entrées
- ✅ Système de versioning et workflow
- ✅ Import/Export CSV
- ✅ Audit trail complet
- ✅ Dashboard avec statistiques

### ✅ Phase 2 - Performance & UX (100%)
- ✅ **Redis Caching** : Système de cache avec fallback gracieux
- ✅ **Batch Operations** : Opérations en lot avec confirmation
- ✅ **Advanced Search** : Recherche multi-champs avec pagination
- ✅ **Toast Notifications** : Système de notifications moderne
- ✅ **Enhanced Loading** : Skeleton screens optimisés

### 🔄 Phase 3 - Intégrations Avancées (75%)
- ✅ **Push Notifications PWA** : Service Worker + API complète
- ✅ **Webhooks Avancés** : Templates + Circuit breaker + Monitoring
- 🔄 **Historique Visuel** : Diff viewer pour comparer versions
- ⏳ **Tests E2E** : Suite de tests automatisés complète

### 📋 Prochaines Étapes
- Finaliser le composant DiffViewer
- Implémenter la comparaison visuelle des versions
- Créer la suite de tests E2E complète
- Tests d'intégration webhooks et notifications

## ✨ Fonctionnalités

### 🔐 Authentification & Autorisation

- **NextAuth.js** avec sessions en base de données
- **RBAC** (Role-Based Access Control) à 3 niveaux :
  - `Admin` : Accès complet au système
  - `User` : Création et gestion de matrices
  - `Viewer` : Consultation uniquement
- **Permissions granulaires** par matrice :
  - `Owner` : Contrôle total de la matrice
  - `Editor` : Modification des entrées
  - `Viewer` : Lecture seule

### 📊 Gestion des Matrices

- **CRUD complet** des matrices de flux
- **Entrées de flux** avec champs détaillés :
  - Zones source/destination
  - Adresses IP/CIDR
  - Services et protocoles
  - Actions (Allow/Deny)
  - Métadonnées (requester, dates, commentaires)
- **Import/Export CSV** avec mapping intelligent
- **Recherche et filtrage** avancés
- **Tableaux interactifs** avec tri et pagination

### 📝 Versioning & Audit

- **Système de versions** avec snapshots complets
- **Workflow d'approbation** configurable
- **Statuts de version** : Draft, In Review, Approved, Rejected
- **Audit trail** automatique de toutes les actions
- **Historique détaillé** des modifications

### 🎨 Interface Utilisateur

- **Design moderne** avec Tailwind CSS
- **Composants réutilisables** (Button, Modal, Table, etc.)
- **Interface responsive** mobile-first
- **Dark mode** support (prévu)
- **Dashboard** avec statistiques en temps réel
- **Notifications** et feedback utilisateur

### 🔧 Intégrations & Phase 2/3

- **Redis Caching** : Système de cache avec fallback gracieux
- **Batch Operations** : Opérations en lot sur les entrées de flux
- **Advanced Search** : Recherche multi-champs avec filtres avancés
- **Toast Notifications** : Système de notifications utilisateur moderne
- **Enhanced Loading States** : États de chargement avec skeleton screens
- **Webhooks Avancés** : Templates configurables et circuit breaker
- **Push Notifications PWA** : Notifications push natives
- **Historique Visuel** : Diff viewer pour comparer les versions
- **Tests E2E** : Suite de tests automatisés complète

## 🏗️ Architecture technique

### Stack technologique

```
Frontend:
├── Next.js 15.2.3 (App Router)
├── React 18.2
├── TypeScript 5.5
├── Tailwind CSS 3.4
└── Zod (validation)

Backend:
├── Next.js API Routes
├── Prisma ORM 6.14
├── PostgreSQL 17
├── NextAuth.js 5.0 beta
├── Redis (ioredis 5.4.1) - Caching
└── bcrypt.js (hashing)

Infrastructure:
├── Docker & Docker Compose
├── Node.js 22+
├── HTTPS/SSL natif avec ACME
├── Multi-CA support (Let's Encrypt, ZeroSSL, etc.)
└── Multi-stage builds optimisés
```

### Structure du projet

```
matrix-flow/
├── web/                        # Application Next.js
│   ├── app/                    # App Router pages
│   │   ├── api/               # API Routes
│   │   │   ├── auth/         # Authentification
│   │   │   ├── matrices/     # CRUD matrices & batch ops
│   │   │   ├── dashboard/    # Statistiques (cachées)
│   │   │   ├── admin/        # Panel admin & webhooks
│   │   │   ├── notifications/ # Push notifications PWA
│   │   │   └── users/        # Gestion utilisateurs
│   │   ├── matrices/          # Pages matrices
│   │   ├── login/             # Page connexion
│   │   └── page.tsx           # Dashboard
│   ├── components/            # Composants React
│   │   └── ui/               # Composants UI réutilisables
│   ├── lib/                   # Utilitaires
│   │   ├── db.ts             # Client Prisma
│   │   ├── cache.ts          # Système de cache Redis
│   │   ├── rbac.ts           # Contrôle d'accès
│   │   ├── audit.ts          # Système d'audit
│   │   ├── csv.ts            # Import/Export CSV
│   │   ├── session.ts        # Gestion sessions
│   │   ├── webhooks.ts       # Service webhooks avancé
│   │   └── security/         # Utilitaires sécurité
│   │       ├── headers.ts    # CSP et headers
│   │       └── rateLimit.ts  # Rate limiting
│   ├── prisma/               # ORM
│   │   ├── schema.prisma     # Modèle de données
│   │   └── seed.cjs          # Données initiales
│   └── middleware.ts          # Protection routes
├── docker-compose.yml         # Config développement
├── docker-compose.prod.yml    # Config production
├── scripts/                   # Scripts utilitaires
│   └── acme-init.sh          # ACME multi-CA setup
├── ACME_MULTI_CA_GUIDE.md     # Guide ACME complet
├── STEP_CA_SETUP.md           # Guide Step-CA
└── Makefile                   # Commandes développement
```

### Modèle de données

```prisma
User (utilisateurs)
├── GlobalRole: admin | user | viewer
├── Matrices owned
├── Permissions sur matrices
└── Sessions & audit logs

Matrix (matrices de flux)
├── FlowEntry[] (entrées)
├── MatrixVersion[] (versions)
├── MatrixPermission[] (permissions)
├── Webhook[] (webhooks configurables)
└── NotificationPreferences (préférences push)

FlowEntry (règles de flux)
├── Zones source/destination
├── CIDR et services
├── Actions et métadonnées
└── Timestamps

MatrixVersion (versioning)
├── Snapshot JSON
├── Status workflow
├── Approvals tracking
└── Publication state
```

## 🚀 Installation

### Prérequis

- Node.js 22+ ou Docker
- PostgreSQL 17 (ou via Docker)
- Git

### Installation rapide avec Docker

```bash
# Cloner le repository
git clone https://github.com/votre-org/matrix-flow.git
cd matrix-flow

# Copier les variables d'environnement
cp .env.example .env

# Lancer avec Docker Compose
make up

# L'application est disponible sur http://localhost:3000

# Pour HTTPS avec certificats auto-signés
make https
# Application disponible sur https://localhost
```

### Installation manuelle

```bash
# Cloner le repository
git clone https://github.com/votre-org/matrix-flow.git
cd matrix-flow/web

# Installer les dépendances
npm install

# Configurer la base de données
cp .env.example .env.local
# Éditer .env.local avec vos paramètres

# Initialiser la base de données
npx prisma db push
npx prisma generate
npm run db:seed

# Lancer en développement
npm run dev

# Ou build pour production
npm run build
npm start
```

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env` (ou `.env.local` pour le développement) :

```bash
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/matrixflow"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# Environnement
NODE_ENV="development"

# PostgreSQL (pour Docker)
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="changeme"
POSTGRES_DB="matrixflow"

# Redis Cache (Phase 2 - Optionnel)
REDIS_URL="redis://redis:6379"

# HTTPS & SSL (Optionnel)
ENABLE_HTTPS=false
HTTP_PORT=3000
HTTPS_PORT=443
GENERATE_SELF_SIGNED=true
SSL_CERTS_PATH=./ssl

# ACME Multi-CA (Optionnel)
ACME_CA_SERVER=letsencrypt
ACME_EMAIL=admin@localhost
CHALLENGE_METHOD=http
SSL_KEY_SIZE=4096
```

### Configuration production

Pour la production, générer des secrets sécurisés :

```bash
# Générer un secret NextAuth
openssl rand -base64 32

# Générer un mot de passe PostgreSQL
openssl rand -base64 16
```

## 📖 Utilisation

### Connexion initiale

Après l'installation, un utilisateur admin est créé :
- **Username** : `admin`
- **Password** : `admin`

⚠️ **Important** : Changer ce mot de passe immédiatement en production !

### Workflow typique

1. **Créer une matrice** : Dashboard → Nouvelle matrice
2. **Ajouter des entrées** : Via formulaire ou import CSV
3. **Créer une version** : Snapshot de l'état actuel
4. **Workflow d'approbation** : Soumettre pour revue
5. **Publication** : Version approuvée devient active
6. **Export** : Télécharger en CSV pour documentation

### Import CSV

Format attendu pour l'import :

```csv
"Nom de la règle","Zone Source","IP Source","Zone Destination","IP Destination","Service","Action"
"Allow_Web","DMZ","192.168.1.0/24","Internet","0.0.0.0/0","443/tcp","ALLOW"
"Block_SSH","Internet","0.0.0.0/0","DMZ","192.168.1.0/24","22/tcp","DENY"
```

## 🔌 API

### Endpoints principaux

```http
# Authentification
POST   /api/auth/register     # Créer un compte
POST   /api/auth/[...nextauth] # Login/Logout

# Matrices
GET    /api/matrices          # Liste des matrices
POST   /api/matrices          # Créer une matrice
GET    /api/matrices/:id      # Détails d'une matrice
PUT    /api/matrices/:id      # Modifier une matrice
DELETE /api/matrices/:id      # Supprimer une matrice

# Entrées de flux
POST   /api/matrices/:id/entries       # Ajouter une entrée
PUT    /api/matrices/:id/entries/:eid  # Modifier une entrée
DELETE /api/matrices/:id/entries/:eid  # Supprimer une entrée

# Import/Export
POST   /api/matrices/:id/import  # Import CSV
GET    /api/matrices/:id/export  # Export CSV

# Opérations en lot (Phase 2)
POST   /api/matrices/:id/entries/batch  # Batch delete/update/export
GET    /api/matrices/:id/entries/search # Recherche avancée

# Versioning
GET    /api/matrices/:id/versions  # Liste des versions
POST   /api/matrices/:id/versions  # Créer une version

# Dashboard (avec cache)
GET    /api/dashboard/stats        # Statistiques globales
GET    /api/dashboard/stats-cached # Stats avec cache Redis

# Notifications PWA (Phase 3)
POST   /api/notifications/subscribe   # S'abonner aux notifications
POST   /api/notifications/send       # Envoyer notification
GET    /api/notifications/preferences # Préférences utilisateur

# Webhooks Avancés (Phase 3)
GET    /api/admin/webhooks        # Liste des webhooks (admin)
POST   /api/admin/webhooks        # Créer webhook
GET    /api/admin/webhooks/:id/deliveries # Historique livraisons

# Utilisateurs
GET    /api/users              # Liste des utilisateurs
```

### Exemple d'utilisation

```javascript
// Créer une matrice
const response = await fetch('/api/matrices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Firewall DMZ',
    description: 'Règles pour la zone DMZ',
    requiredApprovals: 2
  })
});

const matrix = await response.json();
```

## 🐳 Déploiement

### Docker Compose Production

```bash
# Build et lancement
docker-compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f

# Arrêter
docker-compose -f docker-compose.prod.yml down
```

### Déploiement sur serveur

1. **Préparer le serveur** :
   - Installer Docker et Docker Compose
   - Configurer le firewall (port 3000 ou reverse proxy)
   - SSL/TLS via reverse proxy (Nginx, Traefik)

2. **Configurer les secrets** :
   ```bash
   # Sur le serveur
   echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
   echo "POSTGRES_PASSWORD=$(openssl rand -base64 16)" >> .env
   ```

3. **Déployer** :
   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

### Kubernetes (Helm Chart)

Un Helm Chart est disponible dans `/k8s/helm` (à venir).

## 🛠️ Développement

### Scripts disponibles (Makefile)

```bash
# Installation et démarrage rapide
make install          # Installation complète (deps + DB)
make dev             # Serveur de développement (local)
make prod            # Production avec Docker Compose

# Base de données
make db-push         # Appliquer le schema Prisma
make db-seed         # Charger les données initiales
make db-reset        # Reset DB (destructeur!)
make db-studio       # Ouvrir Prisma Studio GUI

# HTTPS & SSL
make https           # Démarrer avec HTTPS auto-signé
make https-custom    # HTTPS avec certificats personnalisés
make ssl-dev         # Générer certificats SSL développement

# ACME Multi-CA
make acme-letsencrypt # Configurer avec Let's Encrypt
make acme-zerossl     # Configurer avec ZeroSSL
make acme-buypass     # Configurer avec Buypass
make acme-google      # Configurer avec Google Trust Services
make acme-step-ca     # Configurer avec Step-CA (CA privée)

# Docker
make up              # Démarrer services Docker
make down            # Arrêter services Docker
make logs            # Voir tous les logs
make logs-web        # Logs de l'application web
make logs-db         # Logs PostgreSQL

# Scripts NPM traditionnels (dans web/)
npm run dev           # Serveur de développement
npm run build         # Build production
npm run lint          # Linter ESLint
npm run typecheck     # Vérification TypeScript
npm test             # Tests Jest
```

### Structure des composants

```typescript
// Exemple de composant UI
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={cn(
      'px-4 py-2 rounded',
      variant === 'primary' && 'bg-blue-500 text-white',
      variant === 'secondary' && 'bg-gray-200'
    )}>
      {children}
    </button>
  );
}
```

### Tests

```bash
# Tests unitaires
npm run test

# Tests E2E (Phase 3)
npm run test:e2e

# Coverage
npm run test:coverage

# Tests spécifiques
npm run test -- --testPathPattern=matrix
```

## 🔒 Sécurité

### Bonnes pratiques implémentées

- ✅ **Hashage bcrypt** pour les mots de passe
- ✅ **Sessions sécurisées** avec NextAuth
- ✅ **CSRF protection** automatique
- ✅ **Validation Zod** des entrées  
- ✅ **Prepared statements** via Prisma
- ✅ **RBAC** multi-niveaux
- ✅ **Audit trail** complet
- ✅ **Secrets management** via variables d'environnement
- ✅ **Rate Limiting** avec Redis fallback
- ✅ **CSP Headers** configurables
- ✅ **HTTPS natif** avec ACME multi-CA

### Recommandations production

1. **HTTPS natif** : Support ACME intégré ou reverse proxy
2. **Secrets forts** : Minimum 32 caractères aléatoires
3. **Firewall** : Limiter l'accès aux ports nécessaires  
4. **Backups** : Sauvegardes régulières PostgreSQL + Redis
5. **Monitoring** : Logs et alertes (Prometheus, Grafana)
6. **Rate limiting** : Protection intégrée avec Redis
7. **WAF** : Web Application Firewall recommandé
8. **Cache** : Redis pour les performances
9. **Certificats** : Renouvellement automatique ACME

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les détails.

### Processus de contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de code

- **TypeScript** strict mode
- **ESLint** configuration Next.js
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Prisma](https://www.prisma.io/) - ORM moderne
- [NextAuth.js](https://next-auth.js.org/) - Authentification
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [PostgreSQL](https://www.postgresql.org/) - Base de données

## 📞 Support

Pour toute question ou support :
- 📧 Email : support@matrix-flow.example.com
- 💬 Discord : [Rejoindre le serveur](https://discord.gg/example)
- 🐛 Issues : [GitHub Issues](https://github.com/votre-org/matrix-flow/issues)

---

<div align="center">
  <b>Matrix Flow</b> - Gérez vos flux réseau avec confiance
  <br>
  Made with ❤️ by Your Team
</div>
