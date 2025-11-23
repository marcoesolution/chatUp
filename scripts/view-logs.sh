#!/bin/bash

# Script para visualizar logs do app ChatUp
# Uso: ./scripts/view-logs.sh [filtro]

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📱 Verificando dispositivos...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo -e "${YELLOW}❌ Nenhum dispositivo encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dispositivo encontrado${NC}"
echo ""

# Limpar logcat
echo -e "${GREEN}🧹 Limpando logs anteriores...${NC}"
adb logcat -c

echo ""
echo -e "${GREEN}📋 Capturando logs...${NC}"
echo -e "${YELLOW}💡 Pressione Ctrl+C para parar${NC}"
echo ""

# Filtro padrão ou fornecido pelo usuário
FILTER=${1:-"ReactNativeJS|expo|location|Permission|useLocation|useNearbyUsers|Firebase"}

# Capturar logs com filtro
adb logcat | grep -iE "$FILTER" --line-buffered


