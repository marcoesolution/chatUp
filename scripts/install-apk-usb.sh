#!/bin/bash

# Script para instalar APK no dispositivo Android conectado via USB
# Uso: ./scripts/install-apk-usb.sh [caminho-do-apk]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📱 Verificando dispositivos conectados...${NC}"

# Verificar se adb está disponível
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ ADB não encontrado. Instale o Android SDK Platform Tools.${NC}"
    exit 1
fi

# Verificar dispositivos conectados
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo -e "${RED}❌ Nenhum dispositivo Android encontrado via USB.${NC}"
    echo -e "${YELLOW}💡 Certifique-se de:${NC}"
    echo "   1. O dispositivo está conectado via USB"
    echo "   2. A depuração USB está habilitada"
    echo "   3. Você autorizou o computador no dispositivo"
    echo ""
    echo "Execute: adb devices"
    exit 1
fi

echo -e "${GREEN}✅ ${DEVICES} dispositivo(s) encontrado(s)${NC}"
adb devices

# Encontrar o APK
if [ -n "$1" ]; then
    APK_PATH="$1"
else
    # Procurar APK mais recente nos diretórios comuns do EAS
    APK_PATH=$(find . -name "*.apk" -type f -path "*/android/*" -o -name "*.apk" -type f -path "*/.expo/*" 2>/dev/null | head -1)
    
    if [ -z "$APK_PATH" ]; then
        # Procurar em qualquer lugar
        APK_PATH=$(find . -name "*.apk" -type f -not -path "*/node_modules/*" 2>/dev/null | head -1)
    fi
fi

if [ -z "$APK_PATH" ] || [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ APK não encontrado.${NC}"
    echo -e "${YELLOW}💡 Execute primeiro: npm run build:android:local${NC}"
    echo "   Ou forneça o caminho do APK: ./scripts/install-apk-usb.sh /caminho/para/app.apk"
    exit 1
fi

echo -e "${GREEN}📦 APK encontrado: ${APK_PATH}${NC}"

# Obter informações do APK
APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo -e "${GREEN}📊 Tamanho: ${APK_SIZE}${NC}"

# Desinstalar versão anterior (opcional, mas útil para evitar conflitos)
PACKAGE_NAME="com.chatup.app"
echo -e "${YELLOW}🔄 Verificando instalação anterior...${NC}"
if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    adb uninstall "$PACKAGE_NAME" || echo -e "${YELLOW}⚠️  Não foi possível desinstalar (pode não estar instalado)${NC}"
fi

# Instalar APK
echo -e "${GREEN}⬇️  Instalando APK no dispositivo...${NC}"
if adb install -r "$APK_PATH"; then
    echo -e "${GREEN}✅ APK instalado com sucesso!${NC}"
    echo -e "${GREEN}🚀 Abrindo aplicativo...${NC}"
    adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
    echo -e "${GREEN}✨ Pronto! O app ChatUp deve estar aberto no seu dispositivo.${NC}"
else
    echo -e "${RED}❌ Falha ao instalar APK${NC}"
    exit 1
fi

