#!/bin/bash

# Script para testar versão minimal do app

echo "🧪 Testando versão MINIMAL do app..."
echo ""

# Backup do arquivo original
if [ ! -f "app/_layout.backup.tsx" ]; then
    echo "📦 Fazendo backup do _layout.tsx original..."
    cp app/_layout.tsx app/_layout.backup.tsx 2>/dev/null || true
fi

# Usar versão minimal
echo "🔄 Usando versão minimal..."
cp app/_layout.minimal.tsx app/_layout.tsx

# Limpar caches
echo "🧹 Limpando caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf .expo 2>/dev/null

echo ""
echo "✅ Versão minimal ativada!"
echo ""
echo "🚀 Agora execute:"
echo "   npx expo start --android --clear --tunnel"
echo ""
echo "📝 Se funcionar, o problema está no código do _layout.tsx original"
echo "   Para restaurar: cp app/_layout.backup.tsx app/_layout.tsx"
echo ""

