# Guide de migration - NextAuth v4

## Changements effectués

### 1. Mise à jour des dépendances

```bash
# Ancienne version (instable)
"next-auth": "5.0.0-beta.19"
"@auth/prisma-adapter": "^2.4.0"

# Nouvelle version (stable)
"next-auth": "^4.24.7"
"@next-auth/prisma-adapter": "^1.0.7"
```

### 2. Modifications du code

#### auth.ts
- Changement de `import Credentials from "next-auth/providers/credentials"` vers `import CredentialsProvider from "next-auth/providers/credentials"`
- Changement de `import { PrismaAdapter } from "@auth/prisma-adapter"` vers `import { PrismaAdapter } from "@next-auth/prisma-adapter"`
- Suppression de `trustHost: true` (non supporté en v4)
- Ajout de type casting pour éviter les erreurs TypeScript

#### route.ts
- Changement de l'export des handlers pour être compatible avec NextAuth v4

## Instructions de migration

### 1. Mettre à jour les dépendances

```bash
cd web
npm install
```

### 2. Régénérer le client Prisma

```bash
npm run postinstall
```

### 3. Redémarrer l'application

```bash
# En développement
npm run dev

# Avec Docker
docker-compose down
docker-compose up --build
```

## Vérifications post-migration

1. **Authentification** : Tester la connexion/déconnexion
2. **Sessions** : Vérifier que les sessions persistent
3. **Base de données** : Confirmer que les tables NextAuth sont correctes
4. **Types TypeScript** : Vérifier qu'il n'y a plus d'erreurs de compilation

## Rollback (si nécessaire)

Si des problèmes surviennent, vous pouvez revenir à la version beta :

```bash
npm install next-auth@5.0.0-beta.19 @auth/prisma-adapter@^2.4.0
```

Puis restaurer les fichiers `auth.ts` et `route.ts` depuis votre système de contrôle de version.