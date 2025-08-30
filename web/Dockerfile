# web/Dockerfile
FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    openssl-dev \
    python3 \
    make \
    g++ \
    netcat-openbsd \
    postgresql-client \
    curl \
    bash \
    socat \
    coreutils \
    wget

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

# Build the application without database connection
# ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
ENV PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/.prisma/client/query-engine-linux-musl-openssl-3.0.x
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Créer les répertoires nécessaires avec les bonnes permissions
RUN mkdir -p /backups && chown -R nextjs:nodejs /backups
RUN mkdir -p /app/.prisma && chown -R nextjs:nodejs /app/.prisma
RUN mkdir -p /tmp/prisma && chown -R nextjs:nodejs /tmp/prisma
RUN mkdir -p /app/ssl && chown -R nextjs:nodejs /app/ssl

# Copy necessary files with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs start.sh ./start.sh
COPY --chown=nextjs:nodejs scripts/acme-init.sh ./scripts/acme-init.sh

# Installer acme.sh au build time pour éviter les téléchargements runtime
RUN curl https://get.acme.sh | sh -s -- --install-online && \
    ln -sf /root/.acme.sh/acme.sh /usr/local/bin/acme.sh

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Rendre le script exécutable
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3000 443

ENV PORT=3000
ENV HTTPS_PORT=443
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]