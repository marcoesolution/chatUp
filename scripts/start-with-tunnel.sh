#!/bin/bash

# Script para iniciar Expo com tunnel (resolve problemas de rede)

echo "🚇 Iniciando Expo com tunnel..."
echo ""

# Matar processos antigos
pkill -f "expo start" 2>/dev/null || true
sleep 1

# Limpar caches
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null

echo "🌐 Usando tunnel para conexão..."
echo "   Isso pode ser mais lento, mas resolve problemas de rede"
echo ""

# Iniciar com tunnel
npx expo start --android --clear --tunnel

