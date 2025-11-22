#!/bin/bash

# Script para iniciar Expo com Expo Go (não dev-client)

echo "🔄 Iniciando Expo com Expo Go..."

# Matar processos antigos
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 1

# Limpar caches
echo "🧹 Limpando caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
rm -rf .metro 2>/dev/null

# Verificar se Expo Go está instalado
EXPO_GO_INSTALLED=$(adb shell pm list packages | grep -i "host.exp.exponent" | wc -l)

if [ "$EXPO_GO_INSTALLED" -eq 0 ]; then
    echo "⚠️ Expo Go não está instalado no emulador!"
    echo ""
    echo "📥 Instalando Expo Go..."
    echo "   Abra a Play Store no emulador e instale 'Expo Go'"
    echo "   OU execute: adb install -r <caminho-para-expo-go.apk>"
    echo ""
    read -p "Pressione Enter quando o Expo Go estiver instalado..."
fi

# Verificar dispositivo
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado!"
    exit 1
fi

echo ""
echo "✅ Tudo pronto!"
echo "🚀 Iniciando Expo..."
echo ""
echo "📝 Quando o Expo abrir:"
echo "   1. Escaneie o QR code com o Expo Go"
echo "   2. OU pressione 'a' para abrir no Android"
echo ""

# Iniciar Expo (SEM --dev-client)
npx expo start --android --clear

