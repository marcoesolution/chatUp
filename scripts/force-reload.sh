#!/bin/bash

# Script para forçar reload completo do app no emulador/dispositivo

echo "🔄 Forçando reload completo do app..."

# Verificar se o ADB está disponível
if ! command -v adb &> /dev/null; then
    echo "❌ ADB não encontrado."
    exit 1
fi

# Verificar se há dispositivos conectados
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado."
    exit 1
fi

PACKAGE_NAME="com.chatup.app"

echo "📱 Dispositivos encontrados:"
adb devices

echo ""
echo "🛑 Parando o app..."
adb shell am force-stop "$PACKAGE_NAME" 2>/dev/null || echo "   App não estava rodando"

echo "🗑️ Desinstalando app completamente..."
adb uninstall "$PACKAGE_NAME" 2>/dev/null || echo "   App não estava instalado"

echo "🧹 Limpando dados do app..."
adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || echo "   Dados já estavam limpos"

echo "🧹 Limpando cache do Metro no dispositivo..."
adb shell rm -rf /data/local/tmp/metro-* 2>/dev/null
adb shell rm -rf /data/local/tmp/haste-* 2>/dev/null

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📝 Agora execute:"
echo "   npm run android:watch"
echo ""
echo "   Ou:"
echo "   npx expo start --android --clear --watch"
echo ""

