#!/bin/bash

# Script rápido para capturar apenas erros críticos
# Uso: ./scripts/capture-crash-logs-quick.sh

DEVICE_ID="RXCTA06V4GB"

echo "📱 Capturando logs de ERRO do dispositivo: $DEVICE_ID"
echo "⚠️  Reproduza o crash agora..."
echo ""

# Limpar e capturar apenas erros críticos
adb -s $DEVICE_ID logcat -c
adb -s $DEVICE_ID logcat *:E AndroidRuntime:E ReactNativeJS:E | grep -i -E "chatup|firebase|error|exception|fatal|crash"


