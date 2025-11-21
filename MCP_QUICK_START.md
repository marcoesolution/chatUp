# ⚡ Quick Start - MCP Firebase no Cursor

Guia rápido para configurar o MCP Firebase no Cursor.

## 🎯 Passos Rápidos

### 1. Gerar Service Account Key

1. Acesse: https://console.firebase.google.com/project/chatup-ddcf8/settings/serviceaccounts/adminsdk
2. Clique em **"Gerar nova chave privada"**
3. Salve o arquivo JSON em: `~/.firebase/chatup-ddcf8-service-account.json`

```bash
# Criar diretório
mkdir -p ~/.firebase

# Mover arquivo baixado (ajuste o nome do arquivo)
mv ~/Downloads/chatup-ddcf8-firebase-adminsdk-*.json ~/.firebase/chatup-ddcf8-service-account.json

# Ajustar permissões
chmod 600 ~/.firebase/chatup-ddcf8-service-account.json
```

### 2. Configurar MCP no Cursor

Crie o arquivo `~/.cursor/mcp.json` (configuração global) ou `.cursor/mcp.json` (configuração do projeto):

```bash
# Opção 1: Configuração global (recomendado)
mkdir -p ~/.cursor
nano ~/.cursor/mcp.json

# Opção 2: Configuração do projeto
mkdir -p .cursor
nano .cursor/mcp.json
```

Cole este conteúdo (ajuste o caminho do arquivo):

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "@gannonh/firebase-mcp@latest"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT": "/home/marco/.firebase/chatup-ddcf8-service-account.json"
      },
      "inputs": {
        "projectId": "chatup-ddcf8"
      }
    }
  }
}
```

**⚠️ IMPORTANTE**: Substitua `/home/marco/.firebase/chatup-ddcf8-service-account.json` pelo caminho real do seu arquivo.

Para encontrar o caminho:
```bash
realpath ~/.firebase/chatup-ddcf8-service-account.json
```

### 3. Reiniciar o Cursor

Feche e abra o Cursor novamente.

### 4. Verificar

1. Abra as configurações do Cursor (`Ctrl+,` ou `Cmd+,`)
2. Procure por "MCP" ou "Model Context Protocol"
3. Verifique se o servidor `firebase` está ativo

## ✅ Pronto!

Agora o Cursor pode interagir com seu Firebase através do MCP.

**Teste**: Pergunte ao Cursor algo como:
- "Liste as coleções do Firestore"
- "Quantos usuários temos no Firebase Auth?"
- "Mostre os dados da coleção X"

---

📖 Para mais detalhes, veja [MCP_FIREBASE_SETUP.md](./MCP_FIREBASE_SETUP.md)

