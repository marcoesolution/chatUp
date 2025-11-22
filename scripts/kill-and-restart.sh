#!/bin/bash

# Script para matar processos do Expo e reiniciar completamente

echo "🛑 Parando todos os processos do Expo/Metro..."

# Matar processos do Expo
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "node.*expo" || true

# Aguardar um pouco
sleep 2

echo "🧹 Limpando cache do Metro..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null

echo "📱 Limpando app do emulador..."
PACKAGE_NAME="com.chatup.app"
adb shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true
adb uninstall "$PACKAGE_NAME" 2>/dev/null || true
adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || true

echo "✅ Limpeza concluída!"
echo ""
echo "📝 Agora execute:"
echo "   npx expo start --android --clear --dev-client"
echo ""
echo "   OU se estiver usando Expo Go:"
echo "   npx expo start --android --clear"
echo ""

