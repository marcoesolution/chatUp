#!/bin/bash

# Script para instalar APK no emulador Android
# Uso: ./scripts/install-apk-emulator.sh [caminho-do-apk] [emulator-id]
# Exemplo: ./scripts/install-apk-emulator.sh ./build-123.apk emulator-5554

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detectar emulador (padrão: primeiro emulador encontrado)
if [ -n "$2" ]; then
    EMULATOR_ID="$2"
else
    # Tentar detectar emulador automaticamente
    EMULATOR_ID=$(adb devices | grep -E "emulator.*device" | awk '{print $1}' | head -1)
    
    if [ -z "$EMULATOR_ID" ]; then
        echo -e "${RED}❌ Nenhum emulador encontrado.${NC}"
        echo -e "${YELLOW}💡 Dispositivos disponíveis:${NC}"
        adb devices
        echo ""
        echo -e "${YELLOW}💡 Para iniciar um emulador:${NC}"
        echo "   emulator -avd NOME_DO_AVD"
        echo "   ou via Android Studio"
        exit 1
    fi
fi

echo -e "${BLUE}📱 Instalando APK no emulador: ${EMULATOR_ID}${NC}"
echo ""

# Verificar se adb está disponível
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ ADB não encontrado. Instale o Android SDK Platform Tools.${NC}"
    exit 1
fi

# Verificar se o emulador está conectado
if ! adb devices | grep -q "$EMULATOR_ID.*device"; then
    echo -e "${RED}❌ Emulador ${EMULATOR_ID} não encontrado ou não está rodando.${NC}"
    echo -e "${YELLOW}💡 Dispositivos disponíveis:${NC}"
    adb devices
    exit 1
fi

echo -e "${GREEN}✅ Emulador ${EMULATOR_ID} conectado${NC}"
echo ""

# Encontrar o APK
if [ -n "$1" ]; then
    APK_PATH="$1"
else
    # Procurar APK mais recente (por data de modificação)
    APK_PATH=$(find . -name "*.apk" -type f -not -path "*/node_modules/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
fi

if [ -z "$APK_PATH" ] || [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ APK não encontrado.${NC}"
    echo -e "${YELLOW}💡 Opções:${NC}"
    echo "   1. Execute primeiro: npm run build:android:apk"
    echo "   2. Ou forneça o caminho: ./scripts/install-apk-emulator.sh /caminho/para/app.apk"
    exit 1
fi

# Obter caminho absoluto
APK_PATH=$(realpath "$APK_PATH")

echo -e "${GREEN}📦 APK encontrado: ${APK_PATH}${NC}"
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo -e "${GREEN}📊 Tamanho: ${APK_SIZE}${NC}"
echo ""

# Desinstalar versão anterior
PACKAGE_NAME="com.chatup.app"
echo -e "${YELLOW}🔄 Verificando instalação anterior...${NC}"
if adb -s "$EMULATOR_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    adb -s "$EMULATOR_ID" uninstall "$PACKAGE_NAME" || echo -e "${YELLOW}⚠️  Não foi possível desinstalar (pode não estar instalado)${NC}"
    echo ""
else
    echo -e "${GREEN}ℹ️  App não está instalado ainda${NC}"
    echo ""
fi

# Instalar APK
echo -e "${GREEN}⬇️  Instalando APK no emulador ${EMULATOR_ID}...${NC}"
if adb -s "$EMULATOR_ID" install -r "$APK_PATH"; then
    echo ""
    echo -e "${GREEN}✅ APK instalado com sucesso!${NC}"
    echo ""
    echo -e "${GREEN}🚀 Abrindo aplicativo...${NC}"
    adb -s "$EMULATOR_ID" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
    echo ""
    echo -e "${GREEN}✨ Pronto! O app ChatUp deve estar aberto no emulador.${NC}"
    echo ""
    echo -e "${BLUE}💡 Para ativar modo debug:${NC}"
    echo "   1. Agite o dispositivo no emulador (Ctrl+M ou Menu > Shake)"
    echo "   2. Ou execute: adb -s $EMULATOR_ID shell input keyevent 82"
    echo "   3. Selecione 'Debug' no menu"
    echo ""
    echo -e "${BLUE}💡 Para abrir React Native Debugger:${NC}"
    echo "   npm run debug"
    echo "   ou acesse: http://localhost:8081/debugger-ui/"
else
    echo ""
    echo -e "${RED}❌ Falha ao instalar APK${NC}"
    exit 1
fi

