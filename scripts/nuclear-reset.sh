#!/bin/bash

# Script NUCLEAR - Limpa TUDO e reinicia do zero

echo "💣 RESET NUCLEAR - Limpando TUDO..."
echo ""

# 1. Matar TODOS os processos
echo "🛑 Matando todos os processos..."
pkill -9 -f "expo" 2>/dev/null || true
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "node.*expo" 2>/dev/null || true
pkill -9 -f "react-native" 2>/dev/null || true
sleep 2

# 2. Limpar TODOS os caches
echo "🧹 Limpando TODOS os caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null
rm -rf .expo 2>/dev/null
rm -rf .expo-shared 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
rm -rf .metro 2>/dev/null
rm -rf dist 2>/dev/null

# 3. Limpar porta 8081
echo "🔌 Liberando porta 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true
lsof -ti:19001 | xargs kill -9 2>/dev/null || true
sleep 1

# 4. Limpar app do emulador COMPLETAMENTE
echo "📱 Removendo app do emulador COMPLETAMENTE..."
PACKAGE_NAME="com.chatup.app"
adb shell pm uninstall --user 0 "$PACKAGE_NAME" 2>/dev/null || true
adb uninstall "$PACKAGE_NAME" 2>/dev/null || true
adb shell pm clear "$PACKAGE_NAME" 2>/dev/null || true
adb shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true

# Remover também do Expo Go se estiver lá
adb shell pm clear host.exp.exponent 2>/dev/null || true

# 5. Limpar cache do Expo Go
echo "🧽 Limpando cache do Expo Go..."
adb shell pm clear host.exp.exponent 2>/dev/null || true

# 6. Verificar dispositivo
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️ Nenhum dispositivo conectado!"
    echo "   Conecte um dispositivo ou inicie um emulador."
    exit 1
fi

echo ""
echo "✅ RESET NUCLEAR CONCLUÍDO!"
echo ""
echo "📝 Agora execute:"
echo "   npx expo start --android --clear"
echo ""
echo "   Quando o Expo abrir, pressione 'a' para instalar no Android"
echo ""

