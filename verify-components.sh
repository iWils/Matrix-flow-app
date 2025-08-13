#!/bin/bash
# Script pour vérifier et créer les composants UI manquants

cd web/

echo "Vérification des composants UI..."

# Créer le dossier s'il n'existe pas
mkdir -p components/ui

# Liste des composants requis
components=("Button" "Input" "Card" "Badge" "Table" "Modal" "LoadingSpinner" "Alert" "DataTable")

for comp in "${components[@]}"; do
    if [ ! -f "components/ui/${comp}.tsx" ]; then
        echo "❌ Manquant: components/ui/${comp}.tsx"
    else
        echo "✅ Trouvé: components/ui/${comp}.tsx"
    fi
done

echo ""
echo "Vérification des imports dans les pages..."

# Vérifier les imports problématiques
grep -r "@/components/ui" app/ | head -10