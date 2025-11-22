#!/bin/bash

# Script para build rápido de APK de desenvolvimento
# Uso: ./scripts/build-android-dev.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 Iniciando build do APK Android...${NC}"
echo ""

# Verificar se EAS CLI está instalado
if ! command -v eas &> /dev/null; then
    echo -e "${RED}❌ EAS CLI não encontrado.${NC}"
    echo -e "${YELLOW}💡 Instale com: npm install -g eas-cli${NC}"
    exit 1
fi

# Verificar se está logado no EAS
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você não está logado no EAS.${NC}"
    echo -e "${YELLOW}💡 Execute: eas login${NC}"
    read -p "Deseja fazer login agora? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        eas login
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ EAS CLI configurado${NC}"
echo ""

# Limpar builds anteriores (opcional)
read -p "Deseja limpar builds anteriores? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}🧹 Limpando builds anteriores...${NC}"
    rm -rf .expo/android-builds 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}📦 Iniciando build local...${NC}"
echo -e "${YELLOW}⏳ Isso pode levar alguns minutos...${NC}"
echo ""

# Build local
eas build --platform android --profile preview --local --non-interactive

echo ""
echo -e "${GREEN}✅ Build concluído!${NC}"
echo ""
echo -e "${BLUE}📱 Para instalar no dispositivo USB, execute:${NC}"
echo -e "${GREEN}   npm run install:android${NC}"
echo ""
echo -e "${BLUE}Ou para build e instalação automática:${NC}"
echo -e "${GREEN}   npm run build:install:android${NC}"

