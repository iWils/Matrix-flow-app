#!/bin/sh

echo "🚀 Démarrage de Matrix Flow..."

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
until nc -z db 5432; do
  echo "Base de données non disponible - attente..."
  sleep 2
done
echo "✅ Base de données disponible"

# Créer les tables si elles n'existent pas
echo "🔄 Synchronisation du schéma avec la base de données..."
npx prisma db push --accept-data-loss

# Si des migrations existent, les appliquer
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  echo "📂 Application des migrations..."
  npx prisma migrate deploy || echo "Aucune migration à appliquer"
else
  echo "ℹ️ Aucune migration trouvée, utilisation de db push"
fi

# Toujours exécuter le seed (il vérifie lui-même s'il doit créer l'utilisateur)
echo "👤 Vérification et création de l'utilisateur administrateur si nécessaire..."
npm run db:seed || echo "Seed déjà exécuté ou erreur non critique"

echo "🎉 Initialisation terminée, démarrage de l'application..."

# Démarrer l'application
exec node server.js