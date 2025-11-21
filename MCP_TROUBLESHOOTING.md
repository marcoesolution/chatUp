# 🔧 Troubleshooting MCP Firebase

## Erro Encontrado

O pacote `@gannonh/firebase-mcp` pode apresentar problemas de dependência com Node.js v23.

## Soluções Tentadas

### ✅ Solução 1: Instalação Global
O pacote foi instalado globalmente:
```bash
npm install -g @gannonh/firebase-mcp@1.4.9
```

### ✅ Solução 2: Configuração Atualizada
A configuração foi atualizada para usar:
- Variável `GOOGLE_APPLICATION_CREDENTIALS` (padrão do Firebase)
- Versão específica do pacote (1.4.9)
- Múltiplas variáveis de ambiente para compatibilidade

## Configuração Atual

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": [
        "-y",
        "--yes",
        "@gannonh/firebase-mcp@1.4.9"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/home/marco/.firebase/chatup-ddcf8-service-account.json",
        "FIREBASE_PROJECT_ID": "chatup-ddcf8",
        "FIREBASE_SERVICE_ACCOUNT": "/home/marco/.firebase/chatup-ddcf8-service-account.json"
      }
    }
  }
}
```

## Próximos Passos

1. **Reinicie o Cursor completamente**
2. **Verifique os logs MCP**:
   - Pressione `Ctrl+Shift+U` no Cursor
   - Selecione "MCP Logs" no menu suspenso
   - Procure por erros específicos

3. **Se ainda não funcionar**, tente:
   - Usar Node.js v20 (versão LTS) em vez de v23
   - Ou aguardar atualização do pacote

## Verificar Erro Específico

Por favor, compartilhe o erro exato que aparece no terminal do Cursor para que possamos diagnosticar melhor.



