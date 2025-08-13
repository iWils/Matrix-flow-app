#!/bin/sh

echo "🚀 Démarrage de Matrix Flow..."

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
until nc -z db 5432; do
  echo "Base de données non disponible - attente..."
  sleep 2
done
echo "✅ Base de données disponible"

# Synchroniser le schéma avec la base de données
echo "🔄 Synchronisation du schéma de base de données..."
npx prisma db push --accept-data-loss

# Toujours exécuter le seed (il vérifie lui-même s'il doit créer l'utilisateur)
echo "👤 Vérification et création de l'utilisateur administrateur si nécessaire..."
npm run db:seed || echo "Seed déjà exécuté ou erreur non critique"

echo "🎉 Initialisation terminée, démarrage de l'application..."

# Démarrer l'application
exec node server.js