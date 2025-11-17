#!/bin/bash

# Script de nettoyage des branches obsolètes
# Ce script supprime les branches qui ont déjà été mergées dans main

echo "🧹 Nettoyage des branches obsolètes..."
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fetch pour avoir les dernières informations
echo "📡 Récupération des dernières informations du remote..."
git fetch origin --prune

# Liste des branches déjà mergées dans main
echo ""
echo "${YELLOW}📋 Branches déjà mergées dans main :${NC}"
MERGED_BRANCHES=$(git branch -r --merged origin/main | grep "claude/" | sed 's/origin\///' | grep -v "HEAD")

if [ -z "$MERGED_BRANCHES" ]; then
    echo "${GREEN}✅ Aucune branche obsolète à supprimer${NC}"
else
    echo "$MERGED_BRANCHES"
    echo ""

    # Demander confirmation
    read -p "Voulez-vous supprimer ces branches du remote ? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🗑️  Suppression des branches..."

        for branch in $MERGED_BRANCHES; do
            echo "  ${RED}✗${NC} Suppression de origin/$branch"
            git push origin --delete "$branch" 2>/dev/null || echo "    ${YELLOW}⚠${NC}  Impossible de supprimer $branch (peut-être déjà supprimée)"
        done

        echo ""
        echo "${GREEN}✅ Nettoyage terminé !${NC}"
    else
        echo "${YELLOW}⏸️  Nettoyage annulé${NC}"
    fi
fi

echo ""
echo "📊 Branches restantes :"
git branch -r | grep "claude/" | sed 's/origin\//  - /'

echo ""
echo "${GREEN}✨ Terminé !${NC}"
