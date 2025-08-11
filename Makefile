# MatrixFlow V3 - Makefile

SHELL := /bin/sh
COMPOSE := docker compose
WEB_DIR := web
BACKEND_URL := http://localhost:8000

.PHONY: help build up down restart ps logs logs-backend logs-frontend clean nuke lock init-admin wait-backend bash-backend bash-frontend

help:
	@echo "Commandes disponibles :"
	@echo "  build          - Reconstruit toutes les images (sans cache)"
	@echo "  up             - Démarre les services en mode détaché"
	@echo "  down           - Arrête et supprime les services"
	@echo "  restart        - Redémarre la stack"
	@echo "  ps             - Affiche les conteneurs en cours d’exécution"
	@echo "  logs           - Affiche tous les logs en direct"
	@echo "  logs-backend   - Affiche les logs du backend"
	@echo "  logs-frontend  - Affiche les logs du frontend"
	@echo "  lock           - Génère/rafraîchit package-lock.json dans $(WEB_DIR)"
	@echo "  wait-backend   - Attend que le backend soit prêt"
	@echo "  init-admin     - Crée l’utilisateur admin par défaut (dépend de wait-backend)"
	@echo "  clean          - Supprime les images/volumes inutilisés"
	@echo "  nuke           - Réinitialisation complète (volumes + images) *** destructif ***"
	@echo "  bash-backend   - Ouvre un shell dans le conteneur backend"
	@echo "  bash-frontend  - Ouvre un shell dans le conteneur frontend"

build:
	$(COMPOSE) build --no-cache

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

# Génère un package-lock.json propre sans installer les node_modules sur ta machine
lock:
	docker run --rm -v "$$(pwd)/$(WEB_DIR)":/app -w /app node:22-alpine \
		sh -lc 'npm install --package-lock-only --no-audit --no-fund'

# Attend que le backend soit prêt (boucle sur /openapi.json)
wait-backend:
	@echo "En attente du backend à l'adresse $(BACKEND_URL) ..."
	@for i in $$(seq 1 40); do \
		if curl -fsS $(BACKEND_URL)/openapi.json >/dev/null 2>&1; then \
			echo "Backend prêt ✅"; exit 0; \
		fi; \
		echo "  toujours en attente... ($$i)"; \
		sleep 1; \
	done; \
	echo "Le backend n'est pas prêt ❌"; exit 1

# Crée l'admin par défaut
init-admin: wait-backend
	@echo "Création admin par défaut (si absent)..."
	@if curl -fsS $(BACKEND_URL)/api/token -X POST -H "Content-Type: application/x-www-form-urlencoded" \
		-d "username=admin&password=esce12345-" >/dev/null 2>&1; then \
		echo "Admin déjà présent ✅"; \
	else \
		curl -sS -X POST $(BACKEND_URL)/api/register \
			-H "Content-Type: application/json" \
			-d '{"username":"admin","password":"esce12345-","role":"admin"}' && echo ""; \
	fi

# Nettoyage léger
clean:
	-docker image prune -f
	-docker volume prune -f

# Nettoyage total (dangereux)
nuke:
	$(COMPOSE) down -v --rmi all
	-docker system prune -af --volumes

# Shells utilitaires (si tu as besoin de diagnostiquer)
bash-backend:
	$(COMPOSE) exec backend sh

bash-frontend:
	$(COMPOSE) exec frontend sh
