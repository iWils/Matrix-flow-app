#!/bin/bash

# Script d'initialisation ACME multi-CA pour Matrix Flow
# Supporte Let's Encrypt, ZeroSSL, Buypass, Google Trust Services, step-ca et d'autres

set -e

echo "🔧 Configuration ACME multi-CA pour Matrix Flow"

# Variables d'environnement
DOMAIN=${DOMAIN:-localhost}
EMAIL=${ACME_EMAIL:-admin@${DOMAIN}}
CA_SERVER=${ACME_CA_SERVER:-letsencrypt}
ACME_CLIENT=${ACME_CLIENT:-acme.sh}
SSL_KEY_SIZE=${SSL_KEY_SIZE:-4096}
CHALLENGE_METHOD=${CHALLENGE_METHOD:-http}
DNS_PROVIDER=${DNS_PROVIDER:-}

# Variables spécifiques à step-ca
STEP_CA_URL=${STEP_CA_URL:-}
STEP_CA_ROOT=${STEP_CA_ROOT:-}
STEP_CA_PASSWORD=${STEP_CA_PASSWORD:-}
STEP_CA_PROVISIONER=${STEP_CA_PROVISIONER:-}

# Serveurs ACME supportés
declare -A ACME_SERVERS=(
    ["letsencrypt"]="https://acme-v02.api.letsencrypt.org/directory"
    ["letsencrypt-staging"]="https://acme-staging-v02.api.letsencrypt.org/directory"
    ["zerossl"]="https://acme.zerossl.com/v2/DV90"
    ["buypass"]="https://api.buypass.com/acme/directory"
    ["buypass-test"]="https://api.test4.buypass.no/acme/directory"
    ["google"]="https://dv.acme-v02.api.pki.goog/directory"
    ["google-staging"]="https://dv.acme-v02.test-api.pki.goog/directory"
    ["ssl.com"]="https://acme.ssl.com/sslcom-dv-rsa"
    ["ssl.com-ecc"]="https://acme.ssl.com/sslcom-dv-ecc"
    ["step-ca"]="custom"
)

# Fonction pour installer acme.sh si nécessaire
install_acme_sh() {
    if ! command -v acme.sh &> /dev/null; then
        echo "📦 Installation d'acme.sh..."
        curl https://get.acme.sh | sh -s email=${EMAIL}
        source ~/.bashrc
        # Créer un lien symbolique global
        ln -sf ~/.acme.sh/acme.sh /usr/local/bin/acme.sh
    else
        echo "✅ acme.sh déjà installé"
    fi
}

# Fonction pour installer step-cli si nécessaire
install_step_cli() {
    if ! command -v step &> /dev/null; then
        echo "📦 Installation de step-cli..."
        # Détecter l'architecture
        ARCH=$(uname -m)
        case $ARCH in
            x86_64) ARCH="amd64" ;;
            aarch64|arm64) ARCH="arm64" ;;
            armv7l) ARCH="armv7" ;;
            *) echo "❌ Architecture non supportée: $ARCH"; exit 1 ;;
        esac
        
        # Télécharger et installer step-cli
        STEP_VERSION="0.25.2"  # Version stable
        wget -O step-cli.tar.gz "https://github.com/smallstep/cli/releases/download/v${STEP_VERSION}/step_linux_${STEP_VERSION}_${ARCH}.tar.gz"
        tar -xzf step-cli.tar.gz
        cp step_${STEP_VERSION}/bin/step /usr/local/bin/
        rm -rf step-cli.tar.gz step_${STEP_VERSION}
        chmod +x /usr/local/bin/step
    else
        echo "✅ step-cli déjà installé"
    fi
}

# Fonction pour configurer le serveur CA
setup_ca_server() {
    local ca_name="$1"
    local ca_url="${ACME_SERVERS[$ca_name]}"
    
    if [[ -z "$ca_url" ]]; then
        echo "❌ Serveur CA '$ca_name' non supporté"
        echo "🔍 Serveurs supportés: ${!ACME_SERVERS[@]}"
        exit 1
    fi
    
    echo "🎯 Configuration du serveur CA: $ca_name"
    echo "📡 URL: $ca_url"
    
    # Configuration spécifique selon le CA
    case "$ca_name" in
        "zerossl")
            echo "⚠️  ZeroSSL requiert une clé d'API pour la production"
            echo "   Définir ZEROSSL_API_KEY si nécessaire"
            ;;
        "buypass"|"buypass-test")
            echo "ℹ️  Buypass est un CA norvégien gratuit"
            echo "   Alternative européenne à Let's Encrypt"
            ;;
        "google"|"google-staging")
            echo "ℹ️  Google Trust Services"
            echo "   Nouveau CA de Google (Beta)"
            ;;
        "ssl.com"*)
            echo "⚠️  SSL.com requiert un compte et configuration API"
            echo "   CA commercial avec support étendu"
            ;;
        "step-ca")
            echo "🏠 Step-CA - Autorité de Certification privée"
            echo "   Configuration personnalisée requise"
            echo "   Variables nécessaires:"
            echo "   - STEP_CA_URL: URL du serveur step-ca"
            echo "   - STEP_CA_ROOT: Certificat racine"
            echo "   - STEP_CA_PROVISIONER: Nom du provisionneur"
            ;;
    esac
}

# Fonction pour configurer step-ca
setup_step_ca() {
    echo "🏠 Configuration de Step-CA"
    
    # Vérifier les variables requises
    if [[ -z "$STEP_CA_URL" ]]; then
        echo "❌ STEP_CA_URL manquant (ex: https://ca.example.com:9000)"
        exit 1
    fi
    
    if [[ -z "$STEP_CA_ROOT" ]]; then
        echo "❌ STEP_CA_ROOT manquant (certificat racine)"
        exit 1
    fi
    
    if [[ -z "$STEP_CA_PROVISIONER" ]]; then
        echo "❌ STEP_CA_PROVISIONER manquant (nom du provisionneur)"
        exit 1
    fi
    
    # Installer step-cli
    install_step_cli
    
    echo "📡 Bootstrap de l'autorité de certification..."
    step ca bootstrap --ca-url="$STEP_CA_URL" --fingerprint="$STEP_CA_ROOT" --force
    
    # Optionnel: Configuration du contexte
    if [[ -n "$STEP_CA_PASSWORD" ]]; then
        echo "🔐 Configuration avec mot de passe..."
        export STEP_CA_PASSWORD
    fi
    
    echo "✅ Step-CA configuré avec succès"
}

# Fonction pour émettre un certificat via step-ca
issue_step_ca_certificate() {
    local domain="$1"
    
    echo "🔒 Émission du certificat Step-CA pour $domain"
    
    local ssl_dir="/app/ssl"
    mkdir -p "$ssl_dir"
    
    # Générer une clé privée
    step crypto key create "$ssl_dir/key.pem" "$ssl_dir/csr.pem" \
        --kty=RSA --size=${SSL_KEY_SIZE:-4096}
    
    # Obtenir le certificat via step-ca
    if [[ -n "$STEP_CA_PASSWORD" ]]; then
        echo "$STEP_CA_PASSWORD" | step ca certificate \
            "$domain" \
            "$ssl_dir/cert.pem" \
            "$ssl_dir/key.pem" \
            --provisioner="$STEP_CA_PROVISIONER"
    else
        step ca certificate \
            "$domain" \
            "$ssl_dir/cert.pem" \
            "$ssl_dir/key.pem" \
            --provisioner="$STEP_CA_PROVISIONER"
    fi
    
    # Récupérer la chaîne complète (root + intermédiaire)
    step ca root > "$ssl_dir/fullchain.pem"
    cat "$ssl_dir/cert.pem" >> "$ssl_dir/fullchain.pem"
    
    echo "✅ Certificat Step-CA émis avec succès"
    echo "📄 Fichiers générés:"
    echo "   - Clé privée: $ssl_dir/key.pem"
    echo "   - Certificat: $ssl_dir/cert.pem"
    echo "   - Chaîne complète: $ssl_dir/fullchain.pem"
}

# Fonction pour émettre le certificat
issue_certificate() {
    local domain="$1"
    local ca_server="$2"
    
    echo "🔒 Émission du certificat pour $domain via $ca_server"
    
    # Gestion spéciale pour step-ca
    if [[ "$ca_server" == "step-ca" ]]; then
        setup_step_ca
        issue_step_ca_certificate "$domain"
        return 0
    fi
    
    local ca_url="${ACME_SERVERS[$ca_server]}"
    
    # Commande de base
    local cmd="acme.sh --issue -d $domain --server $ca_url"
    
    # Ajouter la méthode de validation
    case "$CHALLENGE_METHOD" in
        "http")
            cmd="$cmd --webroot /app/public"
            ;;
        "dns")
            if [[ -n "$DNS_PROVIDER" ]]; then
                cmd="$cmd --dns $DNS_PROVIDER"
            else
                cmd="$cmd --dns dns_manual"
            fi
            ;;
        "standalone")
            cmd="$cmd --standalone"
            ;;
        "alpn")
            cmd="$cmd --alpn"
            ;;
    esac
    
    # Ajouter la taille de clé
    cmd="$cmd --keylength $SSL_KEY_SIZE"
    
    # Configuration spécifique ZeroSSL
    if [[ "$ca_server" == "zerossl" && -n "$ZEROSSL_API_KEY" ]]; then
        export ZeroSSL_API_Key="$ZEROSSL_API_KEY"
    fi
    
    echo "🚀 Exécution: $cmd"
    eval "$cmd"
    
    # Installation du certificat
    local ssl_dir="/app/ssl"
    mkdir -p "$ssl_dir"
    
    acme.sh --install-cert -d "$domain" \
        --key-file "$ssl_dir/key.pem" \
        --fullchain-file "$ssl_dir/cert.pem" \
        --reloadcmd "echo 'Certificat installé pour $domain'"
    
    echo "✅ Certificat installé dans $ssl_dir"
}

# Fonction pour configurer le renouvellement automatique
setup_auto_renewal() {
    echo "🔄 Configuration du renouvellement automatique"
    
    # Installer la crontab acme.sh
    acme.sh --install-cronjob
    
    # Script de post-renouvellement pour redémarrer l'application
    cat > /usr/local/bin/matrix-flow-reload.sh << 'EOF'
#!/bin/bash
echo "🔄 Renouvellement certificat détecté"
# Redémarrer le container ou envoyer un signal
if [ -f "/var/run/matrix-flow.pid" ]; then
    kill -USR1 $(cat /var/run/matrix-flow.pid)
else
    echo "⚠️ PID non trouvé, redémarrage manuel requis"
fi
EOF
    
    chmod +x /usr/local/bin/matrix-flow-reload.sh
    
    # Configurer le hook de renouvellement
    acme.sh --install-cert -d "$DOMAIN" \
        --reloadcmd "/usr/local/bin/matrix-flow-reload.sh"
}

# Fonction principale
main() {
    echo "🌐 Matrix Flow - Configuration ACME Multi-CA"
    echo "📧 Email: $EMAIL"
    echo "🏷️  Domaine: $DOMAIN"
    echo "🏢 Serveur CA: $CA_SERVER"
    echo "🔐 Méthode: $CHALLENGE_METHOD"
    echo ""
    
    # Installer acme.sh
    install_acme_sh
    
    # Configurer le serveur CA
    setup_ca_server "$CA_SERVER"
    
    # Émettre le certificat
    issue_certificate "$DOMAIN" "$CA_SERVER"
    
    # Configurer le renouvellement
    setup_auto_renewal
    
    echo ""
    echo "🎉 Configuration ACME terminée !"
    echo "📁 Certificats installés dans: /app/ssl/"
    echo "🔄 Renouvellement automatique configuré"
    
    # Afficher les informations du certificat
    echo ""
    echo "📋 Informations du certificat:"
    acme.sh --info -d "$DOMAIN"
}

# Exécution si appelé directement
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi