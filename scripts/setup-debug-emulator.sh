#!/bin/bash

# Script completo para instalar APK no emulador e configurar debug
# Uso: ./scripts/setup-debug-emulator.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMULATOR_ID="emulator-5554"

echo -e "${BLUE}🔧 Configurando Debug no Emulador${NC}"
echo ""

# Verificar se emulador está conectado
if ! adb devices | grep -q "$EMULATOR_ID.*device"; then
    echo -e "${RED}❌ Emulador ${EMULATOR_ID} não encontrado.${NC}"
    echo -e "${YELLOW}💡 Inicie o emulador primeiro${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Emulador ${EMULATOR_ID} conectado${NC}"
echo ""

# 1. Instalar APK
echo -e "${BLUE}📦 Passo 1: Instalando APK...${NC}"
if [ -f "./build-1763869690965.apk" ]; then
    APK_PATH="./build-1763869690965.apk"
else
    APK_PATH=$(find . -name "*.apk" -type f -not -path "*/node_modules/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
fi

if [ -z "$APK_PATH" ] || [ ! -f "$APK_PATH" ]; then
    echo -e "${YELLOW}⚠️  APK não encontrado. Execute primeiro: npm run build:android:apk:preview${NC}"
    echo -e "${YELLOW}💡 Builds de preview têm debug habilitado${NC}"
    exit 1
fi

PACKAGE_NAME="com.chatup.app"
echo -e "${GREEN}📦 APK: ${APK_PATH}${NC}"

# Desinstalar anterior
if adb -s "$EMULATOR_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    adb -s "$EMULATOR_ID" uninstall "$PACKAGE_NAME" 2>/dev/null || true
fi

# Instalar
echo -e "${GREEN}⬇️  Instalando...${NC}"
adb -s "$EMULATOR_ID" install -r "$APK_PATH"
echo ""

# 2. Habilitar debug remoto
echo -e "${BLUE}🔧 Passo 2: Habilitando debug remoto...${NC}"
adb -s "$EMULATOR_ID" shell settings put global adb_enabled 1
echo -e "${GREEN}✅ Debug remoto habilitado${NC}"
echo ""

# 3. Abrir app
echo -e "${BLUE}🚀 Passo 3: Abrindo app...${NC}"
adb -s "$EMULATOR_ID" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
sleep 2
echo ""

# 4. Abrir menu de desenvolvedor
echo -e "${BLUE}📱 Passo 4: Abrindo menu de desenvolvedor...${NC}"
adb -s "$EMULATOR_ID" shell input keyevent 82
echo -e "${GREEN}✅ Menu aberto - Selecione 'Debug' no menu${NC}"
echo ""

# 5. Instruções
echo -e "${BLUE}📋 Próximos Passos:${NC}"
echo ""
echo -e "${GREEN}1. No emulador, selecione 'Debug' no menu que apareceu${NC}"
echo -e "${GREEN}2. Inicie o Metro Bundler em outro terminal:${NC}"
echo -e "${YELLOW}   npm start${NC}"
echo ""
echo -e "${GREEN}3. Acesse no navegador:${NC}"
echo -e "${YELLOW}   http://localhost:8081/debugger-ui/${NC}"
echo ""
echo -e "${GREEN}4. O console do navegador mostrará os logs do React Native${NC}"
echo ""

