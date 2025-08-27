# Guide de dépannage - Matrix Flow

## Erreur lors de `make install`

### Problème : "Can't reach database server at `db:5432`"

**Symptôme :**
```bash
Error: P1001: Can't reach database server at `db:5432`
Please make sure your database server is running at `db:5432`.
```

**Cause :** La base de données PostgreSQL n'est pas démarrée ou n'est pas accessible.

**Solutions :**

#### Solution 1: Démarrer la base de données d'abord
```bash
# Démarrer uniquement PostgreSQL
docker compose up -d db

# Attendre quelques secondes puis
make install
```

#### Solution 2: Installation complète avec Docker
```bash
# Démarrer tous les services
docker compose up -d

# Puis exécuter les migrations
make db-push
make db-seed
```

### Configuration des environnements

Le projet utilise deux fichiers de configuration :

- **`.env`** : Configuration Docker (utilise `db:5432`)
- **`.env.local`** : Configuration développement local (utilise `localhost:5432`)

Next.js charge automatiquement `.env.local` en priorité sur `.env` pour le développement local.

## Autres erreurs courantes

### Port 3000 déjà utilisé
**Symptôme :** `Port 3000 is in use`

**Solution :** L'application utilisera automatiquement le port 3001. Accédez à `http://localhost:3001`

### Erreurs de permissions Docker
**Symptôme :** `Permission denied` lors des commandes Docker

**Solution :**
```bash
# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer votre session ou exécuter
newgrp docker
```

### Base de données non synchronisée
**Symptôme :** Erreurs de schéma ou tables manquantes

**Solution :**
```bash
# Réinitialiser complètement la base
make db-reset

# Ou forcer la synchronisation
make db-push
make db-seed
```

## Commandes utiles de dépannage

```bash
# Vérifier l'état des conteneurs
docker compose ps

# Voir les logs de la base de données
make logs-db

# Vérifier la santé de l'application
make health

# Nettoyer et redémarrer complètement
make nuke
make install
```