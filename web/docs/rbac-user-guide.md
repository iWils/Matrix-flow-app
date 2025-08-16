# Guide d'utilisation du système RBAC hybride

## Vue d'ensemble

Matrix Flow utilise maintenant un système de permissions hybride qui combine :
- **Rôles de base** : admin, user, viewer (permissions système)
- **Groupes RBAC** : Groupes personnalisés avec permissions granulaires

## 🎯 Comment utiliser le système

### 1. Créer des groupes RBAC personnalisés

1. Aller sur `/admin/rbac`
2. Cliquer sur "Créer un groupe"
3. Définir le nom et la description
4. Sélectionner les permissions par ressource :
   - **matrices** : create, read, update, delete, manage_permissions
   - **users** : create, read, update, delete, manage_roles
   - **audit** : read, export, configure
   - **system** : read, configure, backup, restore

**Exemple de groupes utiles :**
- "Équipe Réseau" : matrices (create, read, update, delete)
- "Auditeurs" : audit (read, export)
- "Support Niveau 2" : users (read, update), audit (read)

### 2. Créer un utilisateur avec rôle + groupes

1. Aller sur `/admin/users`
2. Remplir le formulaire de création :
   - Nom d'utilisateur, email, mot de passe
   - **Rôle de base** : admin/user/viewer
   - **Groupes** : Cocher les groupes souhaités
3. Cliquer "Créer"

### 3. Gérer les groupes d'un utilisateur existant

1. Sur `/admin/users`, trouver l'utilisateur
2. Cliquer sur l'icône "groupes" (3 personnes) dans les actions
3. Dans le modal :
   - Voir les groupes actuels
   - Assigner de nouveaux groupes
   - Retirer des groupes existants

## 🔧 Calcul des permissions finales

```
Permissions effectives = Rôle de base + Permissions des groupes
```

**Exemple concret :**
- **Utilisateur** : Marie Dupont
- **Rôle de base** : `user` (peut créer ses matrices)
- **Groupes** : "Équipe Réseau" + "Auditeurs"
- **Résultat** : Marie peut :
  - Créer ses propres matrices (rôle user)
  - Gérer toutes les matrices réseau (groupe Équipe Réseau)
  - Consulter et exporter les logs d'audit (groupe Auditeurs)

## 📋 Permissions disponibles par ressource

### Matrices
- `create` : Créer de nouvelles matrices
- `read` : Voir les matrices
- `update` : Modifier les matrices
- `delete` : Supprimer les matrices
- `manage_permissions` : Gérer les permissions des matrices

### Users
- `create` : Créer de nouveaux utilisateurs
- `read` : Voir les utilisateurs
- `update` : Modifier les utilisateurs
- `delete` : Supprimer les utilisateurs
- `manage_roles` : Gérer les rôles et groupes

### Audit
- `read` : Consulter les logs d'audit
- `export` : Exporter les logs
- `configure` : Configurer le système d'audit

### System
- `read` : Voir les paramètres système
- `configure` : Modifier les paramètres
- `backup` : Effectuer des sauvegardes
- `restore` : Restaurer des sauvegardes

## 🚀 Avantages du système hybride

1. **Simplicité** : Rôles de base pour 80% des cas
2. **Flexibilité** : Groupes personnalisés pour besoins spécifiques
3. **Évolutivité** : Nouveaux groupes sans modifier le code
4. **Sécurité** : Permissions cumulatives contrôlées
5. **Audit** : Traçabilité complète des permissions

## 🔍 Vérification des permissions

Les permissions sont automatiquement vérifiées via le hook `useGlobalPermissions()` :

```typescript
const permissions = useGlobalPermissions()

// Vérifications automatiques
permissions.canManageUsers  // true si admin OU groupe avec users.manage_roles
permissions.canViewAudit    // true si admin OU groupe avec audit.read
permissions.canCreateMatrix // true si admin/user OU groupe avec matrices.create
```

## 📝 Bonnes pratiques

1. **Commencer simple** : Utiliser les rôles de base pour la plupart des utilisateurs
2. **Groupes spécialisés** : Créer des groupes pour des besoins métier spécifiques
3. **Principe du moindre privilège** : Donner uniquement les permissions nécessaires
4. **Documentation** : Documenter le rôle de chaque groupe créé
5. **Révision régulière** : Vérifier périodiquement les permissions accordées