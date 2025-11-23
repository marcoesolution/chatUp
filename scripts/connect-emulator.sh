#!/bin/bash

# Script para conectar app ao emulador via ADB
# Força a conexão mesmo com dispositivo físico conectado

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMULATOR_ID="emulator-5554"

echo -e "${BLUE}📱 Conectando ao Emulador${NC}"
echo ""

# Verificar se emulador está conectado
if ! adb devices | grep -q "$EMULATOR_ID.*device"; then
    echo -e "${RED}❌ Emulador ${EMULATOR_ID} não encontrado.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Emulador ${EMULATOR_ID} conectado${NC}"
echo ""

# Verificar se Metro está rodando
if ! lsof -i :8081 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Metro não está rodando na porta 8081${NC}"
    echo -e "${YELLOW}💡 Execute primeiro: npm run start:emulator${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Metro está rodando${NC}"
echo ""

# Forçar conexão ao emulador
echo -e "${BLUE}🔗 Conectando app ao emulador...${NC}"
adb -s "$EMULATOR_ID" shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" 2>/dev/null || {
    echo -e "${YELLOW}💡 Abra o Expo Go no emulador e escaneie o QR code${NC}"
    echo -e "${YELLOW}💡 Ou execute: npm run start:emulator${NC}"
}

echo ""
echo -e "${GREEN}✅ Concluído!${NC}"


