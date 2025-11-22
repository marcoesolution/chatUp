#!/bin/bash

# Script para corrigir problemas de rede entre emulador e Metro

echo "🌐 Corrigindo configuração de rede..."

# Verificar se o emulador está rodando
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado!"
    exit 1
fi

# Obter IP do host
HOST_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}')

if [ -z "$HOST_IP" ]; then
    echo "❌ Não foi possível determinar o IP do host"
    exit 1
fi

echo "📡 IP do host: $HOST_IP"

# Configurar DNS no emulador (se necessário)
echo "🔧 Configurando rede do emulador..."
adb shell "settings put global private_dns_mode off" 2>/dev/null || true

# Verificar conectividade
echo "🔍 Testando conectividade..."
adb shell "ping -c 1 $HOST_IP" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Emulador consegue acessar o host"
else
    echo "⚠️ Emulador pode não conseguir acessar o host diretamente"
    echo "   Tente usar 'localhost' ou '10.0.2.2' (IP especial do emulador Android)"
fi

echo ""
echo "📝 Soluções:"
echo "   1. Use 'localhost' se o Metro estiver na mesma máquina"
echo "   2. Use '10.0.2.2' para acessar o host do emulador"
echo "   3. Verifique se o firewall não está bloqueando a porta 8083"
echo ""
echo "🚀 Inicie o Expo com:"
echo "   EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --android --clear"
echo ""

