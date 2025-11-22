#!/bin/bash

# Script para limpar updates do EAS

echo "🧹 Limpando updates do EAS..."
echo ""
echo "📝 Este script lista os updates disponíveis"
echo "   Para deletar, use: eas update:delete <update-id>"
echo "   Ou delete pelo portal: https://expo.dev/accounts/[seu-account]/projects/chatUp/updates"
echo ""

# Listar updates
echo "📋 Listando updates disponíveis:"
echo ""
eas update:list --all

echo ""
echo "📝 Para deletar um update específico:"
echo "   eas update:delete <update-id>"
echo ""
echo "🌐 Ou acesse o portal:"
echo "   https://expo.dev"
echo ""

