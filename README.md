
# Matrix Flow (Next.js 15.2.3, Node 22, PostgreSQL 17)

Voir le dossier `web/` pour l’application Next.js (App Router) avec NextAuth, Prisma, RBAC, Audit, Versioning, CSV, etc.


## Authentification (NextAuth)
- Provider **Credentials** (email + mot de passe, hashé bcrypt).
- Sessions **database** via Prisma adapter.
- Page de login `/login`, route `[...nextauth]` prête.
- Variables : `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (prod).

## Déploiement production
- Fichier **docker-compose.prod.yml** fourni + `web/.env.production` à compléter.
