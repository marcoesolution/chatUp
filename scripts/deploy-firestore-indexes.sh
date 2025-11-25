#!/bin/bash

# Script para fazer deploy dos índices do Firestore
# Uso: ./scripts/deploy-firestore-indexes.sh

echo "🔥 Deploy dos índices do Firestore"
echo ""

# Verificar se está logado
if ! firebase projects:list &>/dev/null; then
    echo "❌ Você não está logado no Firebase CLI"
    echo "📝 Execute primeiro: npm run firebase:login"
    echo "   ou: firebase login"
    exit 1
fi

echo "✅ Autenticado no Firebase"
echo ""

# Verificar se o projeto está configurado
PROJECT_ID=$(firebase use 2>&1 | grep -oP 'Using \K[^\s]+' || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo "🔧 Configurando projeto: chatup-ddcf8"
    firebase use chatup-ddcf8
fi

echo "📦 Fazendo deploy dos índices..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Índices criados com sucesso!"
    echo "⏳ Aguarde alguns minutos para os índices ficarem ativos"
else
    echo ""
    echo "❌ Erro ao fazer deploy dos índices"
    exit 1
fi

