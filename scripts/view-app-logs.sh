#!/bin/bash

# Script para visualizar logs do app ChatUp
# Captura logs do React Native, Expo e do app

set -e

PACKAGE_NAME="com.chatup.app"

echo "📱 Capturando logs do app ChatUp..."
echo "💡 Pressione Ctrl+C para parar"
echo ""

# Limpar logs anteriores
adb logcat -c

# Capturar logs do app usando o PID
# Primeiro, obter o PID do app
PID=$(adb shell "pidof $PACKAGE_NAME" 2>/dev/null || echo "")

if [ -z "$PID" ]; then
    echo "⚠️ App não está rodando. Inicie o app primeiro."
    echo "📋 Capturando todos os logs relacionados a React Native, Expo e Location..."
    echo ""
    adb logcat | grep -iE "ReactNative|ReactNativeJS|expo|location|Permission|useLocation|Firebase|chatup" --line-buffered
else
    echo "✅ App encontrado (PID: $PID)"
    echo "📋 Capturando logs do app..."
    echo ""
    adb logcat --pid=$PID | grep -iE "ReactNative|ReactNativeJS|expo|location|Permission|useLocation|Firebase" --line-buffered
fi


