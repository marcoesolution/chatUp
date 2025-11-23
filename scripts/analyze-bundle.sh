#!/bin/bash

# Script para analisar o tamanho do bundle do projeto ChatUp
# Este script ajuda a identificar dependências grandes e oportunidades de otimização

echo "📦 Analisando Bundle Size do ChatUp"
echo "===================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Verificando dependências instaladas..."
echo ""

# Contar dependências
TOTAL_DEPS=$(npm list --depth=0 2>/dev/null | grep -c "├──\|└──" || echo "0")
PROD_DEPS=$(cat package.json | grep -A 100 '"dependencies"' | grep -c '".*":' || echo "0")
DEV_DEPS=$(cat package.json | grep -A 100 '"devDependencies"' | grep -c '".*":' || echo "0")

echo "📊 Estatísticas de Dependências:"
echo "   - Total instaladas: $TOTAL_DEPS"
echo "   - Produção: $PROD_DEPS"
echo "   - Desenvolvimento: $DEV_DEPS"
echo ""

# Verificar tamanho do node_modules
if [ -d "node_modules" ]; then
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "📁 Tamanho do node_modules: $NODE_MODULES_SIZE"
    echo ""
fi

# Verificar dependências duplicadas
echo "🔍 Verificando dependências duplicadas..."
DUPLICATES=$(npm ls 2>&1 | grep -i "UNMET\|extraneous\|missing" | head -20)
if [ -z "$DUPLICATES" ]; then
    echo -e "${GREEN}✅ Nenhuma dependência duplicada ou faltando encontrada${NC}"
else
    echo -e "${YELLOW}⚠️  Possíveis problemas encontrados:${NC}"
    echo "$DUPLICATES"
fi
echo ""

# Verificar dependências não utilizadas (requer depcheck)
if command -v depcheck &> /dev/null; then
    echo "🔍 Verificando dependências não utilizadas (depcheck)..."
    echo ""
    depcheck --ignores="@babel/*,babel-*,jest,ts-jest,@types/*,eslint-*,prettier" || echo "⚠️  Instale 'depcheck' para verificar: npm install -g depcheck"
    echo ""
else
    echo -e "${YELLOW}💡 Dica: Instale 'depcheck' para verificar dependências não utilizadas:${NC}"
    echo "   npm install -g depcheck"
    echo ""
fi

# Verificar tamanho de assets
if [ -d "assets" ]; then
    echo "🖼️  Analisando assets..."
    ASSETS_SIZE=$(du -sh assets 2>/dev/null | cut -f1)
    echo "   Tamanho total: $ASSETS_SIZE"
    
    # Listar arquivos grandes (>100KB)
    echo ""
    echo "📄 Arquivos grandes (>100KB):"
    find assets -type f -size +100k -exec ls -lh {} \; 2>/dev/null | awk '{print "   " $5 " - " $9}' || echo "   Nenhum arquivo grande encontrado"
    echo ""
fi

# Verificar se expo-image está instalado
if grep -q "expo-image" package.json; then
    echo -e "${GREEN}✅ expo-image está instalado (otimização de imagens)${NC}"
else
    echo -e "${YELLOW}⚠️  expo-image não encontrado. Considere instalar para melhor performance:${NC}"
    echo "   npx expo install expo-image"
fi
echo ""

# Recomendações
echo "💡 Recomendações para otimização:"
echo "   1. Use 'expo-image' ao invés de 'Image' do React Native"
echo "   2. Implemente lazy loading de rotas (já implementado no _layout.tsx)"
echo "   3. Use code splitting para módulos grandes"
echo "   4. Otimize imagens antes de adicionar ao projeto"
echo "   5. Remova dependências não utilizadas regularmente"
echo "   6. Use tree-shaking (já habilitado no TypeScript)"
echo ""

# Verificar se há builds antigos
if [ -f "*.apk" ] || [ -f "*.aab" ]; then
    echo -e "${YELLOW}⚠️  Arquivos de build encontrados na raiz. Considere removê-los:${NC}"
    ls -lh *.apk *.aab 2>/dev/null | awk '{print "   " $5 " - " $9}'
    echo ""
fi

echo "✅ Análise concluída!"
echo ""
echo "📚 Para análise mais detalhada do bundle, use:"
echo "   npx react-native-bundle-visualizer"
echo "   ou"
echo "   npx source-map-explorer 'build/*.js'"

