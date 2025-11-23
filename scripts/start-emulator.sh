#!/bin/bash

# Script para iniciar Metro e conectar ao emulador específico
# Força o uso do emulador mesmo com dispositivo físico conectado

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMULATOR_ID="emulator-5554"

echo -e "${BLUE}🚀 Iniciando Metro para Emulador${NC}"
echo ""

# Verificar se emulador está conectado
if ! adb devices | grep -q "$EMULATOR_ID.*device"; then
    echo -e "${RED}❌ Emulador ${EMULATOR_ID} não encontrado.${NC}"
    echo -e "${YELLOW}💡 Inicie o emulador primeiro${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Emulador ${EMULATOR_ID} detectado${NC}"
echo ""

# Desconectar dispositivo físico temporariamente (opcional)
PHYSICAL_DEVICE=$(adb devices | grep -v "emulator" | grep "device" | awk '{print $1}' | head -1)
if [ -n "$PHYSICAL_DEVICE" ]; then
    echo -e "${YELLOW}⚠️  Dispositivo físico detectado: ${PHYSICAL_DEVICE}${NC}"
    echo -e "${YELLOW}💡 Para evitar conflitos, desconecte o dispositivo físico ou use o método abaixo${NC}"
    echo ""
fi

# Configurar variável de ambiente para forçar emulador
export ANDROID_SERIAL="$EMULATOR_ID"

# Configurar redirecionamento de porta (importante para emulador)
echo -e "${BLUE}🔧 Configurando redirecionamento de porta...${NC}"
adb -s "$EMULATOR_ID" reverse tcp:8081 tcp:8081 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Não foi possível configurar redirecionamento (pode já estar configurado)${NC}"
}
echo -e "${GREEN}✅ Porta 8081 redirecionada para o emulador${NC}"
echo ""

echo -e "${GREEN}🔧 Configurando ANDROID_SERIAL=${EMULATOR_ID}${NC}"
echo -e "${GREEN}📱 Metro será iniciado e conectará ao emulador${NC}"
echo ""
echo -e "${BLUE}💡 Para conectar manualmente:${NC}"
echo -e "${YELLOW}   1. Escaneie o QR code com o Expo Go no emulador${NC}"
echo -e "${YELLOW}   2. Ou pressione 'a' no terminal para abrir no Android (emulador)${NC}"
echo ""
echo -e "${BLUE}💡 Se ficar em 'downloading...':${NC}"
echo -e "${YELLOW}   - Execute: npm run fix:downloading${NC}"
echo -e "${YELLOW}   - Ou use: npm run start:tunnel${NC}"
echo ""
echo -e "${BLUE}💡 Para ativar debug:${NC}"
echo -e "${YELLOW}   - No emulador: Ctrl+M > Debug${NC}"
echo -e "${YELLOW}   - Acesse: http://localhost:8081/debugger-ui/${NC}"
echo ""

# Iniciar Metro com reset de cache (opcional)
if [ "$1" == "--clear" ]; then
    echo -e "${YELLOW}🧹 Limpando cache...${NC}"
    npx expo start --clear --android
else
    npx expo start --android
fi

