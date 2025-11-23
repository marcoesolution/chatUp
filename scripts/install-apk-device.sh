#!/bin/bash

# Script para instalar APK no dispositivo físico específico via USB
# Uso: ./scripts/install-apk-device.sh [caminho-do-apk] [device-id]
# Exemplo: ./scripts/install-apk-device.sh ./build-123.apk RXCTA06V4GB

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DEVICE_ID="${2:-RXCTA06V4GB}"  # Usa RXCTA06V4GB como padrão se não fornecido

echo -e "${BLUE}📱 Instalando APK no dispositivo: ${DEVICE_ID}${NC}"
echo ""

# Verificar se adb está disponível
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ ADB não encontrado. Instale o Android SDK Platform Tools.${NC}"
    exit 1
fi

# Verificar se o dispositivo está conectado
if ! adb devices | grep -q "$DEVICE_ID.*device"; then
    echo -e "${RED}❌ Dispositivo ${DEVICE_ID} não encontrado ou não autorizado.${NC}"
    echo -e "${YELLOW}💡 Dispositivos disponíveis:${NC}"
    adb devices
    echo ""
    echo -e "${YELLOW}💡 Certifique-se de:${NC}"
    echo "   1. O dispositivo está conectado via USB"
    echo "   2. A depuração USB está habilitada"
    echo "   3. Você autorizou o computador no dispositivo"
    exit 1
fi

echo -e "${GREEN}✅ Dispositivo ${DEVICE_ID} conectado${NC}"
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
    echo "   2. Ou forneça o caminho: ./scripts/install-apk-device.sh /caminho/para/app.apk"
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
if adb -s "$DEVICE_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    adb -s "$DEVICE_ID" uninstall "$PACKAGE_NAME" || echo -e "${YELLOW}⚠️  Não foi possível desinstalar (pode não estar instalado)${NC}"
    echo ""
else
    echo -e "${GREEN}ℹ️  App não está instalado ainda${NC}"
    echo ""
fi

# Instalar APK
echo -e "${GREEN}⬇️  Instalando APK no dispositivo ${DEVICE_ID}...${NC}"
if adb -s "$DEVICE_ID" install -r "$APK_PATH"; then
    echo ""
    echo -e "${GREEN}✅ APK instalado com sucesso!${NC}"
    echo ""
    echo -e "${GREEN}🚀 Abrindo aplicativo...${NC}"
    adb -s "$DEVICE_ID" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
    echo ""
    echo -e "${GREEN}✨ Pronto! O app ChatUp deve estar aberto no seu dispositivo.${NC}"
else
    echo ""
    echo -e "${RED}❌ Falha ao instalar APK${NC}"
    echo -e "${YELLOW}💡 Tentativas de solução:${NC}"
    echo "   1. Verifique se há espaço suficiente no dispositivo"
    echo "   2. Desinstale manualmente: adb -s $DEVICE_ID uninstall $PACKAGE_NAME"
    echo "   3. Tente novamente: adb -s $DEVICE_ID install -r \"$APK_PATH\""
    exit 1
fi

