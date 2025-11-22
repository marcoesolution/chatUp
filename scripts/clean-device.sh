#!/bin/bash

# Script para limpar o app do dispositivo/emulador Android
# Remove o app instalado e limpa os dados

echo "📱 Limpando app do dispositivo/emulador..."

# Verificar se o ADB está disponível
if ! command -v adb &> /dev/null; then
    echo "❌ ADB não encontrado. Certifique-se de que o Android SDK está instalado."
    exit 1
fi

# Verificar se há dispositivos conectados
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado."
    echo "   Conecte um dispositivo ou inicie um emulador."
    exit 1
fi

echo "🔍 Dispositivos encontrados:"
adb devices

# Nome do pacote do app
PACKAGE_NAME="com.chatup.app"

echo ""
echo "🗑️ Desinstalando app..."
adb uninstall "$PACKAGE_NAME" 2>/dev/null || echo "   App não estava instalado ou já foi removido"

echo "🧹 Limpando dados do app..."
adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || echo "   Não foi possível limpar dados (app pode não estar instalado)"

echo ""
echo "✅ Limpeza do dispositivo concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Execute: npx expo start --clear"
echo "   2. Pressione 'a' para instalar no Android"
echo ""

