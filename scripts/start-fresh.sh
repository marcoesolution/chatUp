#!/bin/bash

# Script para iniciar Expo do zero após reset nuclear

echo "🚀 Iniciando Expo do ZERO..."
echo ""

# Verificar dispositivo
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado!"
    exit 1
fi

echo "📱 Dispositivo encontrado:"
adb devices

echo ""
echo "🔍 Verificando Expo Go..."
EXPO_GO=$(adb shell pm list packages | grep -i "host.exp.exponent" | wc -l)
if [ "$EXPO_GO" -eq 0 ]; then
    echo "⚠️ Expo Go não está instalado!"
    echo "   Instale o Expo Go da Play Store no emulador"
    exit 1
fi

echo "✅ Expo Go está instalado"
echo ""
echo "🚀 Iniciando Expo..."
echo ""
echo "📝 INSTRUÇÕES:"
echo "   1. Quando o Expo abrir, pressione 'a' para Android"
echo "   2. O app deve abrir no Expo Go"
echo "   3. Para testar: salve um arquivo e veja se atualiza"
echo "   4. Se não atualizar, pressione 'r' no terminal do Expo"
echo ""

# Iniciar Expo com todas as flags de limpeza
npx expo start --android --clear --no-dev --minify

