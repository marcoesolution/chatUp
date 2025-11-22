#!/bin/bash

# Script para limpar completamente o projeto
# Remove todos os caches, builds e arquivos temporários

echo "🧹 Iniciando limpeza completa do projeto..."

# Limpar cache do Expo
echo "📦 Limpando cache do Expo..."
rm -rf .expo
rm -rf .expo-shared

# Limpar cache do Metro Bundler
echo "🚇 Limpando cache do Metro Bundler..."
rm -rf .metro
rm -rf node_modules/.cache

# Limpar builds
echo "🏗️ Limpando builds..."
rm -rf android
rm -rf ios
rm -rf dist

# Limpar cache do npm
echo "📦 Limpando cache do npm..."
npm cache clean --force

# Limpar node_modules
echo "🗑️ Removendo node_modules..."
rm -rf node_modules

# Limpar cache do Gradle (se existir)
if [ -d "$HOME/.gradle" ]; then
    echo "🔧 Limpando cache do Gradle..."
    rm -rf "$HOME/.gradle/caches"
    rm -rf "$HOME/.gradle/daemon"
fi

# Limpar cache do Expo CLI
echo "📱 Limpando cache do Expo CLI..."
rm -rf "$HOME/.expo"

# Limpar arquivos temporários
echo "🧽 Limpando arquivos temporários..."
find . -type d -name ".expo" -exec rm -rf {} + 2>/dev/null
find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.log" -delete 2>/dev/null

echo "✅ Limpeza completa finalizada!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Execute: npm install"
echo "   2. Execute: npx expo start --clear"
echo ""

