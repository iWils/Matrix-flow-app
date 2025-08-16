# 🧹 Plan de ménage pour Matrix Flow

Après avoir analysé le projet Matrix Flow, voici mes recommandations d'optimisation et de nettoyage :

## 1. **Optimisations de performance**

### Scripts package.json à ajouter :
```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "clean": "rm -rf .next node_modules/.cache",
    "db:reset": "prisma migrate reset --force",
    "db:studio": "prisma studio",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Dépendances de développement manquantes :
```json
{
  "devDependencies": {
    "prettier": "^3.0.0",
    "@next/bundle-analyzer": "^15.2.3",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

## 2. **Structure et organisation**

### Créer des index.ts pour les exports centralisés :

**`web/components/ui/index.ts`**
```typescript
export { Alert } from './Alert'
export { Badge } from './Badge'
export { Button } from './Button'
export { Card } from './Card'
export { Input } from './Input'
export { Modal } from './Modal'
export { LoadingSpinner } from './LoadingSpinner'
export { ThemeToggle } from './ThemeToggle'
// ... autres composants
```

**`web/lib/index.ts`**
```typescript
export * from './auth'
export * from './rbac'
export * from './utils'
export * from './validations'
```

**`web/hooks/index.ts`**
```typescript
export { usePermissions } from './usePermissions'
export { useUserGroups } from './useUserGroups'
export { useGlobalPermissions } from './useGlobalPermissions'
```

### Réorganiser les types :
- Créer `web/types/auth.ts`
- Créer `web/types/rbac.ts`
- Créer `web/types/matrix.ts`
- Créer `web/types/api.ts`

## 3. **Configuration et environnement**

### Fichiers de configuration manquants :

**`.prettierrc`**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

**`.eslintrc.json`** (plus strict)
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

**`web/.env.example`**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/matrix_flow"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: External services
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

## 4. **Sécurité et validation**

### Validation centralisée des APIs :

**`web/lib/validations/index.ts`**
```typescript
import { z } from 'zod'

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  permissions: z.record(z.array(z.string()))
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional()
})
```

### Middleware de validation :
```typescript
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (handler: (req: NextRequest, validated: T) => Promise<Response>) => {
    return async (req: NextRequest) => {
      try {
        const body = await req.json()
        const validated = schema.parse(body)
        return handler(req, validated)
      } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }
    }
  }
}
```

## 5. **Documentation manquante**

### À créer :
- `web/docs/api-reference.md` - Documentation des APIs
- `web/docs/deployment.md` - Guide de déploiement
- `web/docs/development.md` - Guide de développement local
- `web/docs/testing.md` - Guide des tests
- `web/README.md` - Documentation principale du projet web

## 6. **Tests**

### Structure de tests recommandée :
```
web/
├── __tests__/
│   ├── components/
│   ├── pages/
│   ├── api/
│   └── utils/
├── jest.config.js
└── jest.setup.js
```

### Configuration Jest :
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

## 7. **Monitoring et logging**

### Système de logging structuré :
```typescript
// web/lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }))
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.message, stack: error?.stack, ...meta, timestamp: new Date().toISOString() }))
  },
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }))
  }
}
```

## 8. **Base de données**

### Optimisations Prisma :

**Index manquants à ajouter :**
```prisma
model User {
  // ...
  @@index([email])
  @@index([role])
}

model Matrix {
  // ...
  @@index([ownerId])
  @@index([createdAt])
}

model UserGroup {
  // ...
  @@index([isActive])
}
```

### Seed data pour développement :
```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Créer un admin par défaut
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@matrix-flow.com' },
    update: {},
    create: {
      email: 'admin@matrix-flow.com',
      name: 'Administrator',
      password: adminPassword,
      role: 'admin'
    }
  })

  // Créer des groupes par défaut
  await prisma.userGroup.createMany({
    data: [
      {
        name: 'Matrix Editors',
        description: 'Can create and edit matrices',
        permissions: { matrices: ['create', 'read', 'update'] },
        isActive: true
      },
      {
        name: 'Viewers',
        description: 'Read-only access to matrices',
        permissions: { matrices: ['read'] },
        isActive: true
      }
    ],
    skipDuplicates: true
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## 9. **Priorités recommandées**

### Phase 1 (Impact immédiat) :
1. ✅ Exports centralisés (`components/ui/index.ts`, `lib/index.ts`, `hooks/index.ts`)
2. ✅ Configuration Prettier/ESLint
3. ✅ Variables d'environnement `.env.example`

### Phase 2 (Qualité) :
1. ✅ Validation Zod sur toutes les APIs
2. ✅ Système de logging structuré
3. ✅ Types TypeScript centralisés

### Phase 3 (Robustesse) :
1. ✅ Infrastructure de tests
2. ✅ Index de base de données
3. ✅ Documentation complète

### Phase 4 (Monitoring) :
1. ✅ Bundle analyzer
2. ✅ Métriques de performance
3. ✅ Monitoring des erreurs

## 10. **Commandes de nettoyage**

```bash
# Nettoyer les caches
npm run clean

# Formater le code
npm run format

# Vérifier le formatage
npm run format:check

# Analyser le bundle
npm run analyze

# Réinitialiser la base de données
npm run db:reset

# Lancer les tests
npm test

# Coverage des tests
npm run test:coverage
```

---

**Note :** Ce plan de ménage est conçu pour améliorer la maintenabilité, la sécurité et les performances du projet Matrix Flow. Chaque phase peut être implémentée indépendamment selon vos priorités.