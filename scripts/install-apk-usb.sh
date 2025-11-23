#!/bin/bash

# Script para instalar APK no dispositivo Android conectado via USB
# Uso: ./scripts/install-apk-usb.sh [caminho-do-apk] [device-id]
# Se device-id não for fornecido, tenta detectar dispositivo físico automaticamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}📱 Verificando dispositivos conectados...${NC}"

# Verificar se adb está disponível
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ ADB não encontrado. Instale o Android SDK Platform Tools.${NC}"
    exit 1
fi

# Detectar device ID
if [ -n "$2" ]; then
    DEVICE_ID="$2"
    echo -e "${BLUE}📱 Usando dispositivo especificado: ${DEVICE_ID}${NC}"
else
    # Tentar detectar dispositivo físico (não emulador)
    PHYSICAL_DEVICE=$(adb devices | grep -v "List" | grep "device$" | grep -v "emulator" | awk '{print $1}' | head -1)
    
    if [ -z "$PHYSICAL_DEVICE" ]; then
        # Se não encontrar físico, usar o primeiro dispositivo disponível
        PHYSICAL_DEVICE=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}' | head -1)
    fi
    
    if [ -z "$PHYSICAL_DEVICE" ]; then
        echo -e "${RED}❌ Nenhum dispositivo Android encontrado via USB.${NC}"
        echo -e "${YELLOW}💡 Certifique-se de:${NC}"
        echo "   1. O dispositivo está conectado via USB"
        echo "   2. A depuração USB está habilitada"
        echo "   3. Você autorizou o computador no dispositivo"
        echo ""
        echo "Execute: adb devices"
        exit 1
    fi
    
    DEVICE_ID="$PHYSICAL_DEVICE"
    echo -e "${BLUE}📱 Dispositivo detectado automaticamente: ${DEVICE_ID}${NC}"
fi

# Verificar se o dispositivo está conectado
if ! adb devices | grep -q "$DEVICE_ID"; then
    echo -e "${RED}❌ Dispositivo ${DEVICE_ID} não encontrado.${NC}"
    echo -e "${YELLOW}💡 Dispositivos disponíveis:${NC}"
    adb devices
    exit 1
fi

echo -e "${GREEN}✅ Dispositivo conectado: ${DEVICE_ID}${NC}"
adb devices

# Encontrar o APK
if [ -n "$1" ]; then
    APK_PATH="$1"
else
    # Procurar APK mais recente (por data de modificação)
    # Primeiro tenta nos diretórios comuns do EAS
    APK_PATH=$(find . -name "*.apk" -type f \( -path "*/android/*" -o -path "*/.expo/*" -o -path "./build-*.apk" \) -not -path "*/node_modules/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
    
    if [ -z "$APK_PATH" ]; then
        # Procurar em qualquer lugar (exceto node_modules)
        APK_PATH=$(find . -name "*.apk" -type f -not -path "*/node_modules/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
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
if adb -s "$DEVICE_ID" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${YELLOW}🗑️  Desinstalando versão anterior...${NC}"
    adb -s "$DEVICE_ID" uninstall "$PACKAGE_NAME" || echo -e "${YELLOW}⚠️  Não foi possível desinstalar (pode não estar instalado)${NC}"
else
    echo -e "${GREEN}ℹ️  App não está instalado ainda${NC}"
fi

# Instalar APK
echo -e "${GREEN}⬇️  Instalando APK no dispositivo ${DEVICE_ID}...${NC}"
if adb -s "$DEVICE_ID" install -r "$APK_PATH"; then
    echo -e "${GREEN}✅ APK instalado com sucesso!${NC}"
    echo -e "${GREEN}🚀 Abrindo aplicativo...${NC}"
    adb -s "$DEVICE_ID" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
    echo -e "${GREEN}✨ Pronto! O app ChatUp deve estar aberto no seu dispositivo.${NC}"
else
    echo -e "${RED}❌ Falha ao instalar APK${NC}"
    echo -e "${YELLOW}💡 Tentativas de solução:${NC}"
    echo "   1. Verifique se há espaço suficiente no dispositivo"
    echo "   2. Desinstale manualmente: adb -s $DEVICE_ID uninstall $PACKAGE_NAME"
    echo "   3. Tente novamente: adb -s $DEVICE_ID install -r $APK_PATH"
    exit 1
fi


