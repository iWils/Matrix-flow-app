# Guide du Panneau d'Administration Matrix Flow

## Vue d'ensemble

Le panneau d'administration de Matrix Flow offre un contrôle complet sur la configuration système, la gestion des utilisateurs, la sécurité et l'intégration avec des systèmes externes.

## Accès au Panneau d'Administration

- **URL** : `/admin`
- **Prérequis** : Rôle administrateur requis
- **Navigation** : Accessible via le menu principal pour les administrateurs

## Fonctionnalités Principales

### 1. Dashboard Administrateur (`/admin`)

Le tableau de bord principal affiche :
- **Statistiques système** : Nombre d'utilisateurs, matrices, logs d'audit
- **État de santé** : Base de données, authentification, audit
- **Activité récente** : Dernières actions effectuées
- **Actions rapides** : Raccourcis vers les tâches courantes

### 2. Gestion RBAC (`/admin/rbac`)

#### Groupes d'Utilisateurs
- Création de groupes personnalisés
- Attribution de permissions granulaires par ressource
- Gestion des membres des groupes
- Activation/désactivation des groupes

#### Permissions Disponibles
- **Matrices** : create, read, update, delete, manage_permissions
- **Utilisateurs** : create, read, update, delete, manage_roles
- **Audit** : read, export, configure
- **Système** : read, configure, backup, restore

### 3. Configuration d'Authentification (`/admin/auth`)

#### LDAP/Active Directory
- Configuration du serveur LDAP
- Paramètres de connexion (Bind DN, mot de passe)
- Mapping des attributs utilisateur
- Test de connexion

#### OIDC (OpenID Connect)
- Configuration du fournisseur OIDC
- Client ID et secret
- Mapping des claims
- Scopes personnalisés

### 4. Configuration Messagerie (`/admin/email`)

#### Paramètres SMTP
- Serveur et port SMTP
- Authentification et sécurité
- Expéditeur par défaut
- Test de connexion

#### Templates d'Email
- Templates prédéfinis (bienvenue, réinitialisation, partage)
- Éditeur HTML/texte
- Variables dynamiques
- Activation/désactivation

### 5. Audit et Logs (`/admin/audit`)

#### Configuration
- Niveau de logging (error, warn, info, debug)
- Rétention des logs
- Logging fichier
- Taille maximale des fichiers

#### Consultation
- Historique complet des actions
- Filtrage par utilisateur, action, entité
- Export des logs
- Détails des modifications

### 6. Paramètres Système (`/admin/system`)

#### Général
- Nom et description de l'application
- Langue et fuseau horaire par défaut
- Mode maintenance

#### Sécurité
- Timeout de session
- Politique de mots de passe
- Tentatives de connexion
- Verrouillage de compte

#### Sauvegarde
- Sauvegarde automatique
- Fréquence et rétention
- Répertoire de destination
- Sauvegarde manuelle

## Base de Données

### Nouvelles Tables

#### `system_settings`
Stockage des paramètres de configuration système organisés par catégorie.

#### `user_groups`
Définition des groupes d'utilisateurs avec permissions personnalisées.

#### `user_group_members`
Association entre utilisateurs et groupes.

#### `auth_providers`
Configuration des fournisseurs d'authentification externes.

#### `email_templates`
Templates d'emails avec variables dynamiques.

## APIs Administrateur

### Endpoints Principaux

- `GET /api/admin/dashboard` - Statistiques du tableau de bord
- `GET/POST /api/admin/system/settings` - Paramètres système
- `GET/POST /api/admin/rbac/groups` - Gestion des groupes
- `GET/POST /api/admin/auth/providers` - Fournisseurs d'auth
- `GET/POST /api/admin/email/settings` - Configuration email
- `GET/POST /api/admin/email/templates` - Templates email

### Sécurité des APIs

- Authentification requise
- Vérification du rôle administrateur
- Validation des données d'entrée
- Audit des modifications

## Migration et Déploiement

### Script de Migration

Le fichier `prisma/migrations/add_admin_tables.sql` contient :
- Création des nouvelles tables
- Index et contraintes
- Données par défaut
- Templates d'email prédéfinis

### Commandes de Déploiement

```bash
# Appliquer les migrations
npx prisma db push

# Ou exécuter le script SQL directement
psql -d matrix_flow -f prisma/migrations/add_admin_tables.sql

# Générer le client Prisma
npx prisma generate
```

## Sécurité et Bonnes Pratiques

### Contrôle d'Accès
- Restriction stricte aux administrateurs
- Audit de toutes les modifications
- Sessions sécurisées

### Configuration Sécurisée
- Chiffrement des mots de passe SMTP
- Validation des configurations externes
- Test de connexion avant activation

### Monitoring
- Logs détaillés des actions admin
- Alertes sur les modifications critiques
- Sauvegarde automatique des configurations

## Dépannage

### Problèmes Courants

1. **Accès refusé au panneau admin**
   - Vérifier le rôle utilisateur dans la base de données
   - Contrôler la session d'authentification

2. **Erreur de connexion LDAP/OIDC**
   - Vérifier les paramètres réseau
   - Tester les credentials
   - Contrôler les certificats SSL

3. **Emails non envoyés**
   - Vérifier la configuration SMTP
   - Tester la connexion au serveur
   - Contrôler les templates actifs

### Logs de Débogage

Les logs système incluent :
- Actions administratives
- Erreurs de configuration
- Tentatives de connexion externes
- Modifications de paramètres

## Support et Maintenance

### Sauvegarde Recommandée

- Configuration système
- Templates d'email personnalisés
- Groupes et permissions RBAC
- Paramètres d'authentification

### Mise à Jour

Lors des mises à jour :
1. Sauvegarder la configuration actuelle
2. Appliquer les nouvelles migrations
3. Tester les fonctionnalités critiques
4. Vérifier les intégrations externes