#!/bin/bash

# Script para fazer um start completamente fresco do app

echo "🔄 Iniciando processo de start fresco..."

# 1. Matar processos
echo "🛑 Parando processos..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 1

# 2. Limpar caches
echo "🧹 Limpando caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
rm -rf .metro 2>/dev/null

# 3. Limpar app do emulador
echo "📱 Limpando app do emulador..."
PACKAGE_NAME="com.chatup.app"
adb shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true
adb uninstall "$PACKAGE_NAME" 2>/dev/null || true
adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || true

# 4. Verificar dispositivo
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado!"
    echo "   Conecte um dispositivo ou inicie um emulador."
    exit 1
fi

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "🚀 Iniciando Expo com cache limpo..."
echo ""
echo "📱 Certifique-se de que o Expo Go está instalado no emulador!"
echo "   Se não estiver, instale da Play Store ou execute:"
echo "   adb install -r ~/.expo/android-app-debug.apk"
echo ""

# 5. Iniciar Expo (sem --dev-client para usar Expo Go)
npx expo start --android --clear

