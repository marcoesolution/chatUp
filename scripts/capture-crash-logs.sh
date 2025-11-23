#!/bin/bash

# Script para capturar logs de crash do app no dispositivo físico
# Uso: ./scripts/capture-crash-logs.sh

DEVICE_ID="RXCTA06V4GB"
PACKAGE_NAME="com.chatup.app"
LOG_FILE="crash-logs-$(date +%Y%m%d-%H%M%S).log"

echo "📱 Capturando logs do dispositivo: $DEVICE_ID"
echo "📦 Package: $PACKAGE_NAME"
echo "📄 Logs serão salvos em: $LOG_FILE"
echo ""
echo "⚠️  Reproduza o crash agora (abra o app e vá até a tela de lista de contatos)"
echo "⏹️  Pressione Ctrl+C para parar a captura"
echo ""
echo "🔍 Iniciando captura de logs..."
echo ""

# Limpar logs antigos
adb -s $DEVICE_ID logcat -c

# Capturar logs com filtros específicos
adb -s $DEVICE_ID logcat \
  *:E \
  AndroidRuntime:E \
  ReactNativeJS:E \
  ReactNative:V \
  chromium:E \
  | grep -i -E "chatup|firebase|error|exception|fatal|crash|reactnative|$PACKAGE_NAME" \
  | tee "$LOG_FILE"

