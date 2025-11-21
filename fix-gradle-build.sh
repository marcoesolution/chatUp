#!/bin/bash
# Script para corrigir problemas comuns do build Gradle

echo "🔧 Corrigindo problemas do build Gradle..."

# Limpar cache do npm
echo "📦 Limpando cache do npm..."
npm cache clean --force

# Limpar node_modules e reinstalar
echo "📦 Reinstalando dependências..."
rm -rf node_modules
npm install --legacy-peer-deps

# Limpar cache do Expo
echo "🧹 Limpando cache do Expo..."
npx expo start --clear

# Verificar variáveis de ambiente Android
echo "🔍 Verificando variáveis de ambiente Android..."
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME não está configurado!"
    echo "Execute: export ANDROID_HOME=\$HOME/Android/Sdk"
fi

# Verificar Java
echo "☕ Verificando Java..."
java -version 2>&1 | head -n 1

echo "✅ Limpeza concluída!"
echo ""
echo "Agora tente o build novamente:"
echo "  npm run build:android:apk"

