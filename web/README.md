# Matrix Flow - Application Web

## Architecture

Cette application est construite avec **Next.js 15** en architecture **monolithique**. Elle utilise l'App Router de Next.js et intègre toutes les fonctionnalités dans une seule application.

### Structure du projet

```
web/
├── app/                    # App Router de Next.js
│   ├── api/               # Routes API
│   ├── login/             # Page de connexion
│   ├── matrices/          # Gestion des matrices
│   └── users/             # Gestion des utilisateurs
├── components/            # Composants React réutilisables
├── lib/                   # Utilitaires et configurations
├── prisma/               # Schéma et migrations de base de données
└── public/               # Fichiers statiques
```

## Technologies utilisées

- **Next.js 15.2.3** - Framework React avec App Router
- **NextAuth.js 4.24.7** - Authentification (version stable)
- **Prisma 5.18.0** - ORM pour PostgreSQL
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS
- **PostgreSQL** - Base de données
- **Docker** - Containerisation

## Configuration

### Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@localhost:5432/matrixflow
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Base de données

Le projet utilise PostgreSQL avec Prisma comme ORM. Le schéma inclut :

- **Users** - Gestion des utilisateurs avec rôles (admin, user, viewer)
- **Matrices** - Matrices de flux avec versioning
- **FlowEntries** - Entrées de flux réseau
- **Audit** - Logs d'audit pour traçabilité

### Authentification

- **NextAuth.js v4** avec adaptateur Prisma
- **Credentials Provider** pour authentification par username/password
- **Sessions en base de données** avec durée de 12h
- **RBAC** (Role-Based Access Control) intégré

## Déploiement

### Avec Docker

```bash
# Construction et démarrage
docker-compose up --build

# L'application sera accessible sur http://localhost
```

### Développement local

```bash
# Installation des dépendances
npm install

# Configuration de la base de données
npm run db:push
npm run db:seed

# Démarrage en mode développement
npm run dev
```

## Sécurité

- Mots de passe hashés avec bcryptjs
- Sessions sécurisées avec NextAuth
- Validation des données avec Zod
- Audit trail complet
- Permissions granulaires par matrice

## Performance

- **Multi-stage Docker build** pour optimiser la taille
- **Standalone output** Next.js pour réduire les dépendances
- **Cache des dépendances** npm optimisé
- **Images optimisées** avec Next.js Image

## Maintenance

- **Logs d'audit** automatiques pour toutes les actions
- **Versioning des matrices** avec workflow d'approbation
- **Webhooks** pour intégrations externes
- **Export/Import CSV** pour sauvegarde des données