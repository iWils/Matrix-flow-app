-- Migration pour ajouter les tables d'administration

-- Table pour les paramètres système
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Table pour les groupes d'utilisateurs
CREATE TABLE IF NOT EXISTS "user_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- Table pour les membres des groupes
CREATE TABLE IF NOT EXISTS "user_group_members" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_members_pkey" PRIMARY KEY ("id")
);

-- Table pour les fournisseurs d'authentification
CREATE TABLE IF NOT EXISTS "auth_providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- Table pour les templates d'email
CREATE TABLE IF NOT EXISTS "email_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- Index uniques
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "user_groups_name_key" ON "user_groups"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "user_group_members_userId_groupId_key" ON "user_group_members"("userId", "groupId");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_providers_name_key" ON "auth_providers"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_name_key" ON "email_templates"("name");

-- Clés étrangères
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insertion des paramètres par défaut
INSERT INTO "system_settings" ("key", "value", "category", "description") VALUES
('general.appName', '"Matrix Flow"', 'general', 'Nom de l''application'),
('general.appDescription', '"Gestion des matrices de flux réseau"', 'general', 'Description de l''application'),
('general.defaultLanguage', '"fr"', 'general', 'Langue par défaut'),
('general.timezone', '"Europe/Paris"', 'general', 'Fuseau horaire'),
('general.maintenanceMode', 'false', 'general', 'Mode maintenance'),
('security.sessionTimeout', '720', 'security', 'Timeout de session en minutes'),
('security.passwordMinLength', '8', 'security', 'Longueur minimale du mot de passe'),
('security.passwordRequireSpecialChars', 'true', 'security', 'Exiger des caractères spéciaux'),
('security.maxLoginAttempts', '5', 'security', 'Tentatives de connexion max'),
('security.lockoutDuration', '15', 'security', 'Durée de verrouillage en minutes'),
('audit.retentionDays', '90', 'audit', 'Rétention des logs en jours'),
('audit.logLevel', '"info"', 'audit', 'Niveau de log'),
('audit.enableFileLogging', 'true', 'audit', 'Activer les logs fichier'),
('audit.maxLogFileSize', '100', 'audit', 'Taille max des fichiers de log en MB'),
('backup.autoBackup', 'false', 'backup', 'Sauvegarde automatique'),
('backup.backupFrequency', '"daily"', 'backup', 'Fréquence de sauvegarde'),
('backup.retentionCount', '7', 'backup', 'Nombre de sauvegardes à conserver'),
('backup.backupLocation', '"/backups"', 'backup', 'Répertoire de sauvegarde'),
('email.enabled', 'false', 'email', 'Email activé'),
('email.smtp.host', '""', 'email', 'Serveur SMTP'),
('email.smtp.port', '587', 'email', 'Port SMTP'),
('email.smtp.secure', 'false', 'email', 'SMTP sécurisé'),
('email.smtp.username', '""', 'email', 'Nom d''utilisateur SMTP'),
('email.smtp.password', '""', 'email', 'Mot de passe SMTP'),
('email.from.name', '"Matrix Flow"', 'email', 'Nom expéditeur'),
('email.from.email', '"noreply@example.com"', 'email', 'Email expéditeur')
ON CONFLICT ("key") DO NOTHING;

-- Insertion des templates d'email par défaut
INSERT INTO "email_templates" ("name", "subject", "htmlContent", "textContent", "variables") VALUES
('welcome', 'Bienvenue sur Matrix Flow', 
'<h1>Bienvenue {{fullName}} !</h1><p>Votre compte a été créé avec succès.</p><p>Nom d''utilisateur: {{username}}</p>', 
'Bienvenue {{fullName}} ! Votre compte a été créé avec succès. Nom d''utilisateur: {{username}}', 
'["fullName", "username"]'),
('password_reset', 'Réinitialisation de mot de passe', 
'<h1>Réinitialisation de mot de passe</h1><p>Bonjour {{fullName}},</p><p>Votre mot de passe a été réinitialisé.</p>', 
'Bonjour {{fullName}}, votre mot de passe a été réinitialisé.', 
'["fullName"]'),
('matrix_shared', 'Matrice partagée avec vous', 
'<h1>Nouvelle matrice partagée</h1><p>{{sharedBy}} a partagé la matrice "{{matrixName}}" avec vous.</p>', 
'{{sharedBy}} a partagé la matrice "{{matrixName}}" avec vous.', 
'["sharedBy", "matrixName"]')
ON CONFLICT ("name") DO NOTHING;