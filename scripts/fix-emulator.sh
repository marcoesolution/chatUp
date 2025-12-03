#!/bin/bash

# Script para corrigir problemas comuns do emulador Android
# Uso: ./scripts/fix-emulator.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMULATOR_ID="emulator-5554"

echo -e "${BLUE}🔧 Corrigindo Problemas do Emulador${NC}"
echo ""

# 1. Verificar se há emuladores rodando
echo -e "${BLUE}📱 Passo 1: Verificando emuladores...${NC}"
RUNNING_EMULATORS=$(adb devices | grep "emulator" | awk '{print $1}')
if [ -n "$RUNNING_EMULATORS" ]; then
    echo -e "${YELLOW}⚠️  Emuladores detectados:${NC}"
    echo "$RUNNING_EMULATORS"
    echo ""
    read -p "Deseja encerrar todos os emuladores? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}🛑 Encerrando emuladores...${NC}"
        adb emu kill 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Emuladores encerrados${NC}"
    fi
else
    echo -e "${GREEN}✅ Nenhum emulador rodando${NC}"
fi
echo ""

# 2. Verificar processos do emulador travados
echo -e "${BLUE}🔍 Passo 2: Verificando processos travados...${NC}"
EMULATOR_PROCESSES=$(ps aux | grep -i emulator | grep -v grep | awk '{print $2}' || true)
if [ -n "$EMULATOR_PROCESSES" ]; then
    echo -e "${YELLOW}⚠️  Processos do emulador encontrados:${NC}"
    echo "$EMULATOR_PROCESSES"
    echo ""
    read -p "Deseja matar esses processos? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}🛑 Matando processos...${NC}"
        kill -9 $EMULATOR_PROCESSES 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ Processos encerrados${NC}"
    fi
else
    echo -e "${GREEN}✅ Nenhum processo travado${NC}"
fi
echo ""

# 3. Limpar cache do ADB
echo -e "${BLUE}🧹 Passo 3: Limpando cache do ADB...${NC}"
adb kill-server 2>/dev/null || true
sleep 1
adb start-server 2>/dev/null || true
echo -e "${GREEN}✅ Cache do ADB limpo${NC}"
echo ""

# 4. Listar AVDs disponíveis
echo -e "${BLUE}📋 Passo 4: AVDs disponíveis:${NC}"
if command -v emulator &> /dev/null; then
    emulator -list-avds 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível listar AVDs${NC}"
else
    echo -e "${YELLOW}⚠️  Comando 'emulator' não encontrado${NC}"
    echo -e "${YELLOW}💡 Certifique-se de que o Android SDK está instalado${NC}"
fi
echo ""

# 5. Opções de correção
echo -e "${BLUE}🔧 Opções de Correção:${NC}"
echo ""
echo -e "${GREEN}1. Reiniciar emulador com wipe data (recomendado para tela preta/PIN)${NC}"
echo -e "${GREEN}2. Iniciar emulador normalmente${NC}"
echo -e "${GREEN}3. Apenas verificar status${NC}"
echo ""
read -p "Escolha uma opção (1-3): " -n 1 -r
echo
echo ""

case $REPLY in
    1)
        echo -e "${BLUE}🔄 Reiniciando emulador com wipe data...${NC}"
        echo -e "${YELLOW}⚠️  Isso vai apagar todos os dados do emulador!${NC}"
        read -p "Continuar? (s/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            # Listar AVDs
            AVD_LIST=$(emulator -list-avds 2>/dev/null | head -1)
            if [ -z "$AVD_LIST" ]; then
                echo -e "${RED}❌ Nenhum AVD encontrado${NC}"
                echo -e "${YELLOW}💡 Crie um AVD no Android Studio primeiro${NC}"
                exit 1
            fi
            
            echo -e "${GREEN}📱 Usando AVD: ${AVD_LIST}${NC}"
            echo -e "${YELLOW}🔄 Iniciando emulador com wipe data...${NC}"
            
            # Iniciar emulador em background com wipe data
            emulator -avd "$AVD_LIST" -wipe-data -no-snapshot-load &
            EMULATOR_PID=$!
            
            echo -e "${GREEN}✅ Emulador iniciando (PID: $EMULATOR_PID)${NC}"
            echo -e "${YELLOW}⏳ Aguardando emulador inicializar (pode levar 1-2 minutos)...${NC}"
            
            # Aguardar emulador ficar pronto
            for i in {1..60}; do
                if adb devices | grep -q "$EMULATOR_ID.*device"; then
                    echo -e "${GREEN}✅ Emulador pronto!${NC}"
                    break
                fi
                sleep 2
                echo -n "."
            done
            echo ""
            
            if adb devices | grep -q "$EMULATOR_ID.*device"; then
                echo -e "${GREEN}✅ Emulador conectado: ${EMULATOR_ID}${NC}"
            else
                echo -e "${YELLOW}⚠️  Emulador ainda não está pronto${NC}"
                echo -e "${YELLOW}💡 Verifique manualmente: adb devices${NC}"
            fi
        fi
        ;;
    2)
        echo -e "${BLUE}🚀 Iniciando emulador normalmente...${NC}"
        AVD_LIST=$(emulator -list-avds 2>/dev/null | head -1)
        if [ -z "$AVD_LIST" ]; then
            echo -e "${RED}❌ Nenhum AVD encontrado${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}📱 Usando AVD: ${AVD_LIST}${NC}"
        emulator -avd "$AVD_LIST" &
        echo -e "${GREEN}✅ Emulador iniciando...${NC}"
        echo -e "${YELLOW}⏳ Aguarde o emulador inicializar${NC}"
        ;;
    3)
        echo -e "${BLUE}📊 Status do Emulador:${NC}"
        echo ""
        echo -e "${GREEN}Dispositivos conectados:${NC}"
        adb devices
        echo ""
        echo -e "${GREEN}Processos do emulador:${NC}"
        ps aux | grep -i emulator | grep -v grep || echo "Nenhum processo encontrado"
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Concluído!${NC}"
echo ""
echo -e "${BLUE}💡 Comandos úteis:${NC}"
echo -e "${YELLOW}   - Ver dispositivos: adb devices${NC}"
echo -e "${YELLOW}   - Reiniciar ADB: adb kill-server && adb start-server${NC}"
echo -e "${YELLOW}   - Matar emulador: adb emu kill${NC}"
echo -e "${YELLOW}   - Limpar dados: emulator -avd NOME_AVD -wipe-data${NC}"

