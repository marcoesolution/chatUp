#!/bin/bash

# Script para configurar MCP Firebase no Cursor
# Uso: ./scripts/setup-mcp-firebase.sh

set -e

PROJECT_ID="chatup-ddcf8"
SERVICE_ACCOUNT_DIR="$HOME/.firebase"
SERVICE_ACCOUNT_FILE="$SERVICE_ACCOUNT_DIR/${PROJECT_ID}-service-account.json"
CURSOR_MCP_DIR="$HOME/.cursor"
CURSOR_MCP_FILE="$CURSOR_MCP_DIR/mcp.json"

echo "🔌 Configurando MCP Firebase no Cursor"
echo "========================================"
echo ""

# Verificar se o arquivo de Service Account existe
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Arquivo de Service Account não encontrado: $SERVICE_ACCOUNT_FILE"
    echo ""
    echo "📋 Para obter o arquivo:"
    echo "1. Acesse: https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    echo "2. Clique em 'Gerar nova chave privada'"
    echo "3. Salve o arquivo em: $SERVICE_ACCOUNT_FILE"
    echo ""
    read -p "Pressione Enter quando tiver o arquivo, ou Ctrl+C para cancelar..."
fi

# Verificar se o arquivo existe agora
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Arquivo ainda não encontrado. Abortando."
    exit 1
fi

echo "✅ Arquivo de Service Account encontrado: $SERVICE_ACCOUNT_FILE"

# Ajustar permissões
chmod 600 "$SERVICE_ACCOUNT_FILE"
echo "✅ Permissões ajustadas"

# Criar diretório do Cursor MCP se não existir
mkdir -p "$CURSOR_MCP_DIR"
echo "✅ Diretório do Cursor criado: $CURSOR_MCP_DIR"

# Obter caminho absoluto
SERVICE_ACCOUNT_ABSPATH=$(realpath "$SERVICE_ACCOUNT_FILE")

# Criar ou atualizar arquivo mcp.json
if [ -f "$CURSOR_MCP_FILE" ]; then
    echo "⚠️  Arquivo $CURSOR_MCP_FILE já existe. Fazendo backup..."
    cp "$CURSOR_MCP_FILE" "$CURSOR_MCP_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Criar configuração MCP
cat > "$CURSOR_MCP_FILE" << EOF
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "@gannonh/firebase-mcp@latest"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT": "$SERVICE_ACCOUNT_ABSPATH"
      },
      "inputs": {
        "projectId": "$PROJECT_ID"
      }
    }
  }
}
EOF

echo "✅ Arquivo MCP criado: $CURSOR_MCP_FILE"
echo ""
echo "📋 Configuração:"
echo "   Project ID: $PROJECT_ID"
echo "   Service Account: $SERVICE_ACCOUNT_ABSPATH"
echo ""
echo "🔄 Próximos passos:"
echo "1. Reinicie o Cursor completamente"
echo "2. Verifique as configurações MCP (Ctrl+, → procurar 'MCP')"
echo "3. O servidor 'firebase' deve aparecer como ativo"
echo ""
echo "✅ Configuração concluída!"

