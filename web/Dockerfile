# web/Dockerfile
FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    openssl-dev \
    python3 \
    make \
    g++ \
    netcat-openbsd \
    postgresql-client

# npm à la dernière version
RUN npm install -g npm@latest

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Copier package.json
COPY package.json ./

# Copie le schéma Prisma AVANT l'install
COPY prisma ./prisma

# Installer TOUTES les dépendances
RUN npm install --legacy-peer-deps && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copier node_modules complet depuis deps
COPY --from=deps /app/node_modules ./node_modules

# Copier TOUS les fichiers source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build the application
# ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Créer le répertoire de sauvegarde
RUN mkdir -p /backups && chown -R nextjs:nodejs /backups

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY start.sh ./start.sh

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Rendre le script exécutable
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./start.sh"]