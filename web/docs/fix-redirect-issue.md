# Résolution du problème de redirection vers 127.0.0.1

## Problème
Lorsque vous accédez à l'application via une adresse IP spécifique (ex: 192.168.10.37:3000) mais que vous êtes redirigé vers 127.0.0.1 lors de la connexion.

## Cause
Le middleware Next.js utilisait `request.url` pour construire l'URL de redirection, ce qui prenait l'adresse avec laquelle vous accédiez à l'application (127.0.0.1) au lieu de l'URL configurée.

## Solution appliquée

### 1. Modification du middleware (`web/middleware.ts`)
- Le middleware utilise maintenant `request.nextUrl.clone()` pour préserver le domaine d'origine
- Les redirections stockent uniquement le chemin relatif comme `callbackUrl`

### 2. Ajout de la variable d'environnement `NEXT_PUBLIC_APP_URL`
Cette variable publique permet de définir l'URL de base de l'application accessible côté client.

#### Dans `.env`:
```env
NEXT_PUBLIC_APP_URL="http://192.168.10.37:3000"
```

#### Dans `docker-compose.yml`:
```yaml
environment:
  - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-http://localhost:3000}}
```

### 3. Configuration centralisée (`web/config/app.config.ts`)
Un fichier de configuration centralise les URLs de l'application pour une meilleure maintenance.

## Instructions pour appliquer les changements

1. **Arrêter l'application** (si elle est en cours d'exécution):
   ```bash
   docker-compose down
   ```

2. **Reconstruire l'image Docker** pour prendre en compte les changements:
   ```bash
   docker-compose build web
   ```

3. **Redémarrer l'application**:
   ```bash
   docker-compose up -d
   ```

## Configuration pour différents environnements

### Développement local
```env
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Réseau local (LAN)
```env
NEXTAUTH_URL="http://192.168.1.100:3000"
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"
```

### Production avec domaine
```env
NEXTAUTH_URL="https://monapp.exemple.com"
NEXT_PUBLIC_APP_URL="https://monapp.exemple.com"
```

## Points importants

1. **Les deux variables doivent correspondre** : `NEXTAUTH_URL` et `NEXT_PUBLIC_APP_URL` doivent avoir la même valeur
2. **Utilisez l'adresse avec laquelle vous accédez** : Si vous accédez via 192.168.10.37, configurez cette adresse
3. **Pas de slash final** : N'ajoutez pas de `/` à la fin des URLs
4. **Protocole requis** : Toujours inclure `http://` ou `https://`

## Vérification

Après avoir appliqué les changements :
1. Accédez à votre application via l'adresse configurée
2. Cliquez sur une page protégée
3. Vous devriez être redirigé vers `/login` sur la même adresse (pas 127.0.0.1)
4. Après connexion, vous devriez revenir à la page demandée

## Dépannage

Si le problème persiste :
1. Vérifiez que les variables d'environnement sont bien chargées
2. Videz le cache du navigateur
3. Vérifiez les logs Docker : `docker-compose logs web`
4. Assurez-vous que l'application a été reconstruite après les modifications