#!/bin/bash

# Script para ver logs do dispositivo em tempo real

echo "📱 Visualizando logs do dispositivo..."
echo "   Pressione Ctrl+C para parar"
echo ""

# Limpar logs antigos
adb logcat -c

# Filtrar logs do React Native, JavaScript e erros
adb logcat | grep -E "ReactNativeJS|console|ERROR|Error|Exception|FATAL|Firebase|Expo|chatup|chatUp|JavaScript|JS|Metro"

