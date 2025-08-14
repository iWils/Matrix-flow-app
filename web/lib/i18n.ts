export type Language = 'fr' | 'en' | 'es'

export const languages: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español'
}

export const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    matrices: 'Matrices',
    users: 'Utilisateurs',
    matrixManagement: 'Gestion des Matrices',
    userManagement: 'Gestion des Utilisateurs',
    matrixDetails: 'Détails de la Matrice',
    flowManagement: 'Gestion des flux',
    
    // User Menu
    changeName: 'Modifier le nom',
    changePassword: 'Changer le mot de passe',
    changeLanguage: 'Changer la langue',
    logout: 'Déconnexion',
    user: 'utilisateur',
    
    // Language names
    french: 'Français',
    english: 'Anglais',
    spanish: 'Espagnol',
    
    // Common
    close: 'Fermer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    
    // Dashboard
    welcome: 'Bienvenue',
    thisMonth: 'ce mois',
    activeUsers: 'Actifs',
    operational: 'Opérationnel',
    quickActions: 'Actions rapides',
    createMatrix: 'Créer une matrice',
    newNetworkFlowMatrix: 'Nouvelle matrice de flux réseau',
    addUser: 'Ajouter un utilisateur',
    createNewAccount: 'Créer un nouveau compte',
    browseMatrices: 'Parcourir les matrices',
    viewAllMatrices: 'Voir toutes les matrices',
    features: 'Fonctionnalités',
    accessControl: 'Contrôle d\'accès (RBAC)',
    matrixPermissions: 'Permissions par matrice',
    importExportCsv: 'Import/Export CSV',
    bulkDataManagement: 'Gestion des données en masse',
    versioningAudit: 'Versioning & Audit',
    changeTracking: 'Suivi des modifications',
    approvalWorkflow: 'Workflow d\'approbation',
    changeValidation: 'Validation des changements',
    recentActivity: 'Activité récente',
    noRecentActivity: 'Aucune activité récente',
    viewAllAuditLogs: 'Voir tous les logs d\'audit',
    needHelp: 'Besoin d\'aide ?',
    consultDocumentation: 'Consultez la documentation ou contactez l\'équipe support',
    documentation: 'Documentation',
    support: 'Support',
    
    // Stats
    matricesCount: 'Matrices',
    flowEntries: 'Entrées de flux',
    usersCount: 'Utilisateurs',
    rbacSecurity: 'Sécurité RBAC',
    
    // Activity
    created: 'a créé',
    updated: 'a modifié',
    deleted: 'a supprimé',
    matrixEntity: 'une matrice',
    entryEntity: 'une entrée',
    userEntity: 'un utilisateur',
    system: 'Système'
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    matrices: 'Matrices',
    users: 'Users',
    matrixManagement: 'Matrix Management',
    userManagement: 'User Management',
    matrixDetails: 'Matrix Details',
    flowManagement: 'Flow management',
    
    // User Menu
    changeName: 'Change name',
    changePassword: 'Change password',
    changeLanguage: 'Change language',
    logout: 'Logout',
    user: 'user',
    
    // Language names
    french: 'French',
    english: 'English',
    spanish: 'Spanish',
    
    // Common
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Dashboard
    welcome: 'Welcome',
    thisMonth: 'this month',
    activeUsers: 'Active',
    operational: 'Operational',
    quickActions: 'Quick Actions',
    createMatrix: 'Create Matrix',
    newNetworkFlowMatrix: 'New network flow matrix',
    addUser: 'Add User',
    createNewAccount: 'Create new account',
    browseMatrices: 'Browse Matrices',
    viewAllMatrices: 'View all matrices',
    features: 'Features',
    accessControl: 'Access Control (RBAC)',
    matrixPermissions: 'Matrix permissions',
    importExportCsv: 'Import/Export CSV',
    bulkDataManagement: 'Bulk data management',
    versioningAudit: 'Versioning & Audit',
    changeTracking: 'Change tracking',
    approvalWorkflow: 'Approval Workflow',
    changeValidation: 'Change validation',
    recentActivity: 'Recent Activity',
    noRecentActivity: 'No recent activity',
    viewAllAuditLogs: 'View all audit logs',
    needHelp: 'Need help?',
    consultDocumentation: 'Check documentation or contact support team',
    documentation: 'Documentation',
    support: 'Support',
    
    // Stats
    matricesCount: 'Matrices',
    flowEntries: 'Flow Entries',
    usersCount: 'Users',
    rbacSecurity: 'RBAC Security',
    
    // Activity
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    matrixEntity: 'a matrix',
    entryEntity: 'an entry',
    userEntity: 'a user',
    system: 'System'
  },
  es: {
    // Navigation
    dashboard: 'Panel de control',
    matrices: 'Matrices',
    users: 'Usuarios',
    matrixManagement: 'Gestión de Matrices',
    userManagement: 'Gestión de Usuarios',
    matrixDetails: 'Detalles de la Matriz',
    flowManagement: 'Gestión de flujos',
    
    // User Menu
    changeName: 'Cambiar nombre',
    changePassword: 'Cambiar contraseña',
    changeLanguage: 'Cambiar idioma',
    logout: 'Cerrar sesión',
    user: 'usuario',
    
    // Language names
    french: 'Francés',
    english: 'Inglés',
    spanish: 'Español',
    
    // Common
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    
    // Dashboard
    welcome: 'Bienvenido',
    thisMonth: 'este mes',
    activeUsers: 'Activos',
    operational: 'Operacional',
    quickActions: 'Acciones Rápidas',
    createMatrix: 'Crear Matriz',
    newNetworkFlowMatrix: 'Nueva matriz de flujo de red',
    addUser: 'Agregar Usuario',
    createNewAccount: 'Crear nueva cuenta',
    browseMatrices: 'Explorar Matrices',
    viewAllMatrices: 'Ver todas las matrices',
    features: 'Características',
    accessControl: 'Control de Acceso (RBAC)',
    matrixPermissions: 'Permisos por matriz',
    importExportCsv: 'Importar/Exportar CSV',
    bulkDataManagement: 'Gestión de datos en masa',
    versioningAudit: 'Versionado y Auditoría',
    changeTracking: 'Seguimiento de cambios',
    approvalWorkflow: 'Flujo de Aprobación',
    changeValidation: 'Validación de cambios',
    recentActivity: 'Actividad Reciente',
    noRecentActivity: 'Sin actividad reciente',
    viewAllAuditLogs: 'Ver todos los logs de auditoría',
    needHelp: '¿Necesitas ayuda?',
    consultDocumentation: 'Consulta la documentación o contacta al equipo de soporte',
    documentation: 'Documentación',
    support: 'Soporte',
    
    // Stats
    matricesCount: 'Matrices',
    flowEntries: 'Entradas de Flujo',
    usersCount: 'Usuarios',
    rbacSecurity: 'Seguridad RBAC',
    
    // Activity
    created: 'creó',
    updated: 'modificó',
    deleted: 'eliminó',
    matrixEntity: 'una matriz',
    entryEntity: 'una entrada',
    userEntity: 'un usuario',
    system: 'Sistema'
  }
}

export type TranslationKey = keyof typeof translations.fr