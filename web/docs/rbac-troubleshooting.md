# Guide de dépannage RBAC - Matrix Flow

## Problème : "Je n'ai pas de bouton pour ajouter les groupes et je ne peux pas modifier les groupes"

### Diagnostic étape par étape

#### 1. Vérification de l'authentification

**Ouvrez la console développeur (F12) et tapez :**
```javascript
// Vérifiez votre session
console.log('Session:', window.next?.auth?.session)

// Ou utilisez React DevTools pour voir le hook useSession
```

**Ce que vous devriez voir :**
```javascript
{
  user: {
    id: "...",
    email: "votre@email.com",
    name: "Votre Nom",
    role: "admin"  // ← IMPORTANT : doit être "admin"
  }
}
```

#### 2. Vérification du rôle utilisateur

**Si votre rôle n'est pas "admin" :**

1. **Connectez-vous à votre base de données PostgreSQL**
2. **Vérifiez votre rôle actuel :**
   ```sql
   SELECT id, email, name, role FROM "User" WHERE email = 'votre@email.com';
   ```

3. **Mettez à jour votre rôle si nécessaire :**
   ```sql
   UPDATE "User" SET role = 'admin' WHERE email = 'votre@email.com';
   ```

#### 3. Vérification de l'affichage de la page

**Si vous avez le rôle admin mais ne voyez toujours pas les boutons :**

1. **Ouvrez la console développeur (F12)**
2. **Recherchez des erreurs JavaScript**
3. **Vérifiez l'onglet Network pour voir si les APIs répondent**

#### 4. Test des APIs RBAC

**Testez manuellement les APIs dans la console :**

```javascript
// Test de l'API des groupes
fetch('/api/admin/rbac/groups')
  .then(res => res.json())
  .then(data => console.log('Groupes:', data))
  .catch(err => console.error('Erreur:', err))

// Test de création d'un groupe
fetch('/api/admin/rbac/groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Group',
    description: 'Groupe de test',
    permissions: { matrices: ['read'] }
  })
})
.then(res => res.json())
.then(data => console.log('Création:', data))
```

#### 5. Vérification de la base de données

**Vérifiez que les tables RBAC existent :**

```sql
-- Vérifiez l'existence des tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('UserGroup', 'UserGroupMembership');

-- Vérifiez les données existantes
SELECT * FROM "UserGroup";
SELECT * FROM "UserGroupMembership";
```

### Solutions courantes

#### Solution 1 : Problème de rôle utilisateur

```sql
-- Donnez-vous le rôle admin
UPDATE "User" SET role = 'admin' WHERE email = 'votre@email.com';
```

#### Solution 2 : Tables manquantes

```bash
# Exécutez les migrations Prisma
cd web
npx prisma migrate dev
npx prisma generate
```

#### Solution 3 : Redémarrage de l'application

```bash
# Redémarrez le serveur de développement
npm run dev
# ou
make dev
```

#### Solution 4 : Cache du navigateur

1. **Videz le cache du navigateur** (Ctrl+Shift+R)
2. **Ou ouvrez un onglet de navigation privée**

### Interface attendue

**Quand tout fonctionne, vous devriez voir :**

1. **En haut à droite de la page RBAC :**
   - Un bouton bleu "Créer un groupe" avec une icône +

2. **Pour chaque groupe existant :**
   - Un bouton d'édition (icône crayon)
   - Un bouton de suppression (icône poubelle)

3. **Quand vous cliquez sur "Créer un groupe" :**
   - Un modal s'ouvre avec des champs pour :
     - Nom du groupe
     - Description
     - Sélection des permissions par ressource

### Messages d'erreur possibles

#### "Accès refusé"
- **Cause :** Votre rôle n'est pas "admin"
- **Solution :** Mettez à jour votre rôle dans la base de données

#### "Loading..." qui ne finit jamais
- **Cause :** Problème d'API ou de base de données
- **Solution :** Vérifiez les logs du serveur et la console

#### Erreurs 500 dans la console
- **Cause :** Problème de base de données ou de configuration
- **Solution :** Vérifiez les logs du serveur backend

### Commandes de diagnostic

```bash
# Vérifiez l'état de la base de données
cd web
npx prisma studio

# Vérifiez les logs du serveur
docker-compose logs web

# Testez la connexion à la base de données
npx prisma db pull
```

### Contact support

Si le problème persiste après avoir suivi ce guide :

1. **Copiez les erreurs de la console développeur**
2. **Notez votre rôle utilisateur actuel**
3. **Indiquez si vous voyez d'autres pages admin correctement**
4. **Précisez votre navigateur et version**

---

*Ce guide couvre les problèmes les plus courants avec l'interface RBAC de Matrix Flow.*