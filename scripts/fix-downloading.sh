#!/bin/bash

# Script para corrigir problema de "downloading..." no emulador
# Resolve problemas de conexão entre emulador e Metro

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMULATOR_ID="emulator-5554"

echo -e "${BLUE}🔧 Corrigindo problema de 'downloading...' no emulador${NC}"
echo ""

# 1. Verificar se Metro está rodando
echo -e "${BLUE}📋 Passo 1: Verificando Metro...${NC}"
if lsof -i :8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Metro está rodando na porta 8081${NC}"
else
    echo -e "${RED}❌ Metro NÃO está rodando${NC}"
    echo -e "${YELLOW}💡 Execute: npm run start:emulator${NC}"
    exit 1
fi
echo ""

# 2. Verificar se emulador está conectado
echo -e "${BLUE}📋 Passo 2: Verificando emulador...${NC}"
if ! adb devices | grep -q "$EMULATOR_ID.*device"; then
    echo -e "${RED}❌ Emulador ${EMULATOR_ID} não encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Emulador ${EMULATOR_ID} conectado${NC}"
echo ""

# 3. Verificar conectividade de rede do emulador
echo -e "${BLUE}📋 Passo 3: Verificando rede do emulador...${NC}"
EMULATOR_IP=$(adb -s "$EMULATOR_ID" shell "getprop | grep 'net.hostname' | head -1" | cut -d: -f2 | tr -d '[] ' || echo "")
if [ -z "$EMULATOR_IP" ]; then
    # Tentar obter IP via ifconfig
    EMULATOR_IP=$(adb -s "$EMULATOR_ID" shell "ifconfig | grep 'inet addr' | head -1" | grep -oE 'inet addr:[0-9.]+' | cut -d: -f2 || echo "")
fi
echo -e "${GREEN}✅ IP do emulador: ${EMULATOR_IP:-'detectado'${NC}"
echo ""

# 4. Configurar redirecionamento de porta
echo -e "${BLUE}📋 Passo 4: Configurando redirecionamento de porta...${NC}"
adb -s "$EMULATOR_ID" reverse tcp:8081 tcp:8081
echo -e "${GREEN}✅ Porta 8081 redirecionada${NC}"
echo ""

# 5. Limpar cache do Expo Go no emulador
echo -e "${BLUE}📋 Passo 5: Limpando cache do Expo Go...${NC}"
adb -s "$EMULATOR_ID" shell pm clear host.exp.exponent 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Expo Go não está instalado ou não foi possível limpar cache${NC}"
}
echo -e "${GREEN}✅ Cache limpo${NC}"
echo ""

# 6. Verificar se localhost:8081 está acessível
echo -e "${BLUE}📋 Passo 6: Testando conexão com Metro...${NC}"
if curl -s http://localhost:8081/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Metro está acessível em http://localhost:8081${NC}"
else
    echo -e "${YELLOW}⚠️  Metro pode não estar respondendo corretamente${NC}"
    echo -e "${YELLOW}💡 Tente reiniciar o Metro: npm run start:emulator:clear${NC}"
fi
echo ""

# 7. Instruções finais
echo -e "${GREEN}✅ Correções aplicadas!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo -e "${YELLOW}1. Certifique-se de que o Metro está rodando:${NC}"
echo -e "   ${GREEN}npm run start:emulator${NC}"
echo ""
echo -e "${YELLOW}2. No emulador:${NC}"
echo -e "   - Feche o Expo Go completamente"
echo -e "   - Abra o Expo Go novamente"
echo -e "   - Escaneie o QR code do terminal"
echo ""
echo -e "${YELLOW}3. Se ainda não funcionar:${NC}"
echo -e "   - Use modo tunnel: ${GREEN}npm run start:tunnel${NC}"
echo -e "   - Ou use LAN: ${GREEN}npm run start:lan${NC}"
echo ""
echo -e "${YELLOW}4. Para ver logs do emulador:${NC}"
echo -e "   ${GREEN}adb -s ${EMULATOR_ID} logcat | grep -i expo${NC}"
echo ""

