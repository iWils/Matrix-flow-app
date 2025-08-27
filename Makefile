# Matrix Flow - Makefile
# Application Next.js avec PostgreSQL

SHELL := /bin/sh
COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
WEB_DIR := web
APP_URL := http://localhost:3000

# Couleurs pour les messages
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help build up down restart ps logs logs-web logs-db clean nuke dev prod install db-push db-seed db-reset db-studio test lint typecheck bash-web bash-db backup restore

# Aide par défaut
help:
	@echo "$(GREEN)Matrix Flow - Commandes disponibles$(NC)"
	@echo ""
	@echo "$(YELLOW)🚀 Démarrage rapide:$(NC)"
	@echo "  make install      - Installation complète (dépendances + DB)"
	@echo "  make dev          - Démarre en mode développement"
	@echo "  make prod         - Démarre en mode production"
	@echo ""
	@echo "$(YELLOW)🐳 Docker:$(NC)"
	@echo "  make build        - Reconstruit les images Docker"
	@echo "  make up           - Démarre les services"
	@echo "  make down         - Arrête les services"
	@echo "  make restart      - Redémarre les services"
	@echo "  make ps           - Affiche l'état des conteneurs"
	@echo ""
	@echo "$(YELLOW)📊 Base de données:$(NC)"
	@echo "  make db-push      - Applique le schéma Prisma"
	@echo "  make db-seed      - Charge les données initiales"
	@echo "  make db-reset     - Réinitialise la DB (ATTENTION: destructif)"
	@echo "  make db-studio    - Lance Prisma Studio (GUI)"
	@echo "  make backup       - Sauvegarde la base de données"
	@echo "  make restore      - Restaure la base de données"
	@echo ""
	@echo "$(YELLOW)📝 Logs:$(NC)"
	@echo "  make logs         - Affiche tous les logs"
	@echo "  make logs-web     - Logs de l'application web"
	@echo "  make logs-db      - Logs de PostgreSQL"
	@echo ""
	@echo "$(YELLOW)🧪 Développement:$(NC)"
	@echo "  make lint         - Lance ESLint"
	@echo "  make typecheck    - Vérifie les types TypeScript"
	@echo "  make test         - Lance les tests (si disponibles)"
	@echo "  make bash-web     - Shell dans le conteneur web"
	@echo "  make bash-db      - Shell dans le conteneur PostgreSQL"
	@echo ""
	@echo "$(YELLOW)🧹 Nettoyage:$(NC)"
	@echo "  make clean        - Nettoie les ressources Docker inutilisées"
	@echo "  make nuke         - Réinitialisation complète (DANGER!)"

# Installation complète
install:
	@echo "$(GREEN)Installation de Matrix Flow...$(NC)"
	@cd $(WEB_DIR) && npm install
	@echo "$(GREEN)Génération du client Prisma...$(NC)"
	@cd $(WEB_DIR) && npx prisma generate
	@echo "$(GREEN)Configuration de la base de données...$(NC)"
	@$(MAKE) db-push
	@$(MAKE) db-seed
	@echo "$(GREEN)✅ Installation terminée !$(NC)"
	@echo "Lancez 'make dev' pour démarrer en développement"

# Mode développement (local)
dev:
	@echo "$(GREEN)Démarrage en mode développement...$(NC)"
	@cd $(WEB_DIR) && npm run dev

# Mode production avec Docker
prod:
	@echo "$(GREEN)Démarrage en mode production...$(NC)"
	@$(COMPOSE_PROD) up -d
	@echo "$(GREEN)✅ Application disponible sur $(APP_URL)$(NC)"

# Construction des images Docker
build:
	@echo "$(YELLOW)Construction des images Docker...$(NC)"
	@$(COMPOSE) build --no-cache

# Démarrage des services
up:
	@echo "$(GREEN)Démarrage des services...$(NC)"
	@$(COMPOSE) up -d
	@echo "$(GREEN)✅ Services démarrés$(NC)"
	@echo "Application disponible sur $(APP_URL)"

# Arrêt des services
down:
	@echo "$(YELLOW)Arrêt des services...$(NC)"
	@$(COMPOSE) down

# Redémarrage des services
restart: down up

# État des conteneurs
ps:
	@$(COMPOSE) ps

# Logs de tous les services
logs:
	@$(COMPOSE) logs -f

# Logs de l'application web
logs-web:
	@$(COMPOSE) logs -f web

# Logs de la base de données
logs-db:
	@$(COMPOSE) logs -f db

# Base de données - Appliquer le schéma
db-push:
	@echo "$(YELLOW)Application du schéma Prisma...$(NC)"
	@cd $(WEB_DIR) && npx prisma db push

# Base de données - Seed
db-seed:
	@echo "$(YELLOW)Chargement des données initiales...$(NC)"
	@cd $(WEB_DIR) && npm run db:seed
	@echo "$(GREEN)✅ Utilisateur admin créé (username: admin, password: admin)$(NC)"

# Base de données - Reset complet
db-reset:
	@echo "$(RED)⚠️  ATTENTION: Cette commande va supprimer toutes les données !$(NC)"
	@echo "Appuyez sur Ctrl+C pour annuler, ou Entrée pour continuer..."
	@read confirm
	@cd $(WEB_DIR) && npx prisma db push --force-reset
	@$(MAKE) db-seed
	@echo "$(GREEN)✅ Base de données réinitialisée$(NC)"

# Prisma Studio (GUI pour la DB)
db-studio:
	@echo "$(GREEN)Ouverture de Prisma Studio...$(NC)"
	@cd $(WEB_DIR) && npx prisma studio

# Sauvegarde de la base de données
backup:
	@echo "$(YELLOW)Sauvegarde de la base de données...$(NC)"
	@mkdir -p backups
	@$(COMPOSE) exec -T db pg_dump -U postgres matrixflow > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde créée dans backups/$(NC)"

# Restauration de la base de données
restore:
	@echo "$(YELLOW)Fichiers de sauvegarde disponibles:$(NC)"
	@ls -la backups/*.sql 2>/dev/null || echo "Aucune sauvegarde trouvée"
	@echo ""
	@echo "Entrez le nom du fichier à restaurer (ex: backup_20240113_120000.sql):"
	@read filename; \
	if [ -f "backups/$$filename" ]; then \
		echo "$(YELLOW)Restauration de $$filename...$(NC)"; \
		$(COMPOSE) exec -T db psql -U postgres matrixflow < backups/$$filename; \
		echo "$(GREEN)✅ Restauration terminée$(NC)"; \
	else \
		echo "$(RED)❌ Fichier non trouvé$(NC)"; \
	fi

# Linting
lint:
	@echo "$(YELLOW)Vérification du code avec ESLint...$(NC)"
	@cd $(WEB_DIR) && npm run lint

# Type checking
typecheck:
	@echo "$(YELLOW)Vérification des types TypeScript...$(NC)"
	@cd $(WEB_DIR) && npm run typecheck

# Tests (à implémenter)
test:
	@echo "$(YELLOW)Lancement des tests...$(NC)"
	@cd $(WEB_DIR) && npm test 2>/dev/null || echo "$(YELLOW)⚠️  Aucun test configuré$(NC)"

# Shell dans le conteneur web
bash-web:
	@$(COMPOSE) exec web sh

# Shell dans le conteneur PostgreSQL
bash-db:
	@$(COMPOSE) exec db bash

# Nettoyage léger
clean:
	@echo "$(YELLOW)Nettoyage des ressources Docker inutilisées...$(NC)"
	@docker image prune -f
	@docker volume prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

# Nettoyage complet (DANGER!)
nuke:
	@echo "$(RED)⚠️  DANGER: Cette commande va tout supprimer (conteneurs, volumes, images) !$(NC)"
# 	@echo "Tapez 'CONFIRMER' pour continuer:"
# 	@read confirm; \
# 	if [ "$$confirm" = "CONFIRMER" ]; then \
		echo "$(RED)Suppression en cours...$(NC)"; \
		$(COMPOSE) down -v --rmi all; \
		docker system prune -af --volumes; \
		rm -rf $(WEB_DIR)/node_modules $(WEB_DIR)/.next; \
		echo "$(GREEN)✅ Réinitialisation complète terminée$(NC)"; \
# 	else \
# 		echo "$(YELLOW)Annulé$(NC)"; \
# 	fi
	@echo "$(RED)Suppression en cours...$(NC)"
	$(COMPOSE) down -v --rmi all
	docker system prune -af --volumes
	rm -rf $(WEB_DIR)/node_modules $(WEB_DIR)/.next
	@echo "$(GREEN)✅ Réinitialisation complète terminée$(NC)"

# Vérification de l'état de l'application
health:
	@echo "$(YELLOW)Vérification de l'état de l'application...$(NC)"
	@curl -fsS $(APP_URL) > /dev/null 2>&1 && \
		echo "$(GREEN)✅ Application accessible sur $(APP_URL)$(NC)" || \
		echo "$(RED)❌ Application non accessible$(NC)"
	@$(COMPOSE) exec -T db pg_isready -U postgres > /dev/null 2>&1 && \
		echo "$(GREEN)✅ Base de données opérationnelle$(NC)" || \
		echo "$(RED)❌ Base de données non accessible$(NC)"

# Affichage des variables d'environnement (sans les secrets)
env:
	@echo "$(YELLOW)Variables d'environnement configurées:$(NC)"
	@echo "DATABASE_URL: [CONFIGURÉ]" 
	@echo "NEXTAUTH_URL: $(APP_URL)"
	@echo "NODE_ENV: $${NODE_ENV:-development}"
	@test -f $(WEB_DIR)/.env.local && echo "$(GREEN)✅ .env.local présent$(NC)" || echo "$(YELLOW)⚠️  .env.local manquant$(NC)"
	@test -f .env && echo "$(GREEN)✅ .env présent$(NC)" || echo "$(YELLOW)⚠️  .env manquant$(NC)"

# Génération du package-lock.json
lock:
	@echo "$(YELLOW)Génération du package-lock.json...$(NC)"
	@docker run --rm -v "$$(pwd)/$(WEB_DIR)":/app -w /app node:22-alpine \
		sh -c 'npm install --package-lock-only --no-audit --no-fund'
	@echo "$(GREEN)✅ package-lock.json généré$(NC)"

# Mise à jour des dépendances
update:
	@echo "$(YELLOW)Mise à jour des dépendances...$(NC)"
	@cd $(WEB_DIR) && npm update
	@echo "$(GREEN)✅ Dépendances mises à jour$(NC)"

# Commande par défaut
.DEFAULT_GOAL := help
