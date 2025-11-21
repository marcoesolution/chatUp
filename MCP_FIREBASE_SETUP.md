# 🔌 Guia de Configuração MCP Firebase no Cursor

Este guia mostra como conectar o Cursor ao Firebase usando Model Context Protocol (MCP), permitindo que o Cursor interaja diretamente com seus serviços do Firebase.

## 📋 Pré-requisitos

1. **Node.js instalado** (versão 18 ou superior)
2. **Conta Firebase** com projeto criado
3. **Credenciais de Service Account** do Firebase (será gerado no passo 1)

## 🚀 Passo a Passo

### Passo 1: Gerar Service Account Key no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **chatup-ddcf8**
3. Clique no ícone de **⚙️ Configurações do projeto** (canto superior esquerdo)
4. Vá para a aba **"Contas de serviço"** ou **"Service accounts"**
5. Na seção **"Firebase Admin SDK"**, clique em **"Gerar nova chave privada"** ou **"Generate new private key"**
6. Confirme clicando em **"Gerar chave"** ou **"Generate key"**
7. Um arquivo JSON será baixado (ex: `chatup-ddcf8-firebase-adminsdk-xxxxx.json`)
8. **IMPORTANTE**: Salve este arquivo em um local seguro. Exemplo:
    ```bash
    ~/.firebase/chatup-ddcf8-service-account.json
    ```
    Ou dentro do projeto (mas **NUNCA** commite no Git!):
    ```bash
    .firebase/service-account.json
    ```

### Passo 2: Criar Diretório para Credenciais (Recomendado)

```bash
# Criar diretório para credenciais (fora do controle de versão)
mkdir -p ~/.firebase

# Mover o arquivo JSON baixado para lá
mv ~/Downloads/chatup-ddcf8-firebase-adminsdk-*.json ~/.firebase/chatup-ddcf8-service-account.json
```

### Passo 3: Adicionar ao .gitignore

Certifique-se de que o arquivo de credenciais não seja commitado:

```bash
# Adicionar ao .gitignore
echo ".firebase/" >> .gitignore
echo "**/service-account*.json" >> .gitignore
echo "**/*-firebase-adminsdk-*.json" >> .gitignore
```

### Passo 4: Configurar MCP no Cursor

#### Opção A: Configuração Global (Recomendado)

1. Crie ou edite o arquivo de configuração global do Cursor:

    ```bash
    mkdir -p ~/.cursor
    nano ~/.cursor/mcp.json
    ```

    Ou no Windows:

    ```
    %APPDATA%\Cursor\mcp.json
    ```

2. Adicione a seguinte configuração:

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

**⚠️ IMPORTANTE**: Substitua o caminho `/home/marco/.firebase/chatup-ddcf8-service-account.json` pelo caminho real do seu arquivo de Service Account.

#### Opção B: Configuração por Projeto

1. No diretório raiz do projeto, crie o arquivo:

    ```bash
    mkdir -p .cursor
    nano .cursor/mcp.json
    ```

2. Adicione a mesma configuração acima, mas usando caminho relativo ou absoluto.

### Passo 5: Verificar o Caminho do Arquivo

Para encontrar o caminho absoluto do seu arquivo de Service Account:

```bash
# Linux/Mac
realpath ~/.firebase/chatup-ddcf8-service-account.json

# Ou simplesmente
ls -la ~/.firebase/
```

### Passo 6: Reiniciar o Cursor

1. Feche completamente o Cursor
2. Abra novamente o Cursor
3. O servidor MCP será inicializado automaticamente

### Passo 7: Verificar a Conexão

1. No Cursor, abra as configurações:

    - **Linux/Mac**: `Ctrl+,` ou `Cmd+,`
    - Ou: `File` → `Preferences` → `Settings`

2. Procure por **"MCP"** ou **"Model Context Protocol"** nas configurações

3. Verifique se o servidor `firebase` está listado e com status **ativo**

4. Você também pode verificar no terminal do Cursor:
    - Abra o painel de terminal integrado
    - Procure por mensagens relacionadas ao MCP

## 🔧 Configuração Alternativa (Firebase CLI MCP)

Se preferir usar o Firebase CLI oficial (quando disponível):

```json
{
	"mcpServers": {
		"firebase": {
			"command": "npx",
			"args": ["-y", "firebase-tools@latest", "experimental:mcp"],
			"env": {
				"GOOGLE_APPLICATION_CREDENTIALS": "/home/marco/.firebase/chatup-ddcf8-service-account.json"
			}
		}
	}
}
```

## 📝 Exemplo de Configuração Completa

Aqui está um exemplo completo do arquivo `~/.cursor/mcp.json`:

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

## 🔒 Segurança

### Boas Práticas:

1. **NUNCA** commite arquivos de Service Account no Git
2. Use caminhos absolutos fora do diretório do projeto
3. Mantenha permissões restritas no arquivo:
    ```bash
    chmod 600 ~/.firebase/chatup-ddcf8-service-account.json
    ```
4. Use variáveis de ambiente quando possível
5. Rotacione as chaves periodicamente

### Usando Variáveis de Ambiente (Alternativa)

Você pode usar variáveis de ambiente no lugar do caminho direto:

1. Adicione ao seu `~/.bashrc` ou `~/.zshrc`:

    ```bash
    export FIREBASE_SERVICE_ACCOUNT_PATH="$HOME/.firebase/chatup-ddcf8-service-account.json"
    ```

2. No `mcp.json`, use:
    ```json
    {
    	"mcpServers": {
    		"firebase": {
    			"command": "npx",
    			"args": ["-y", "@gannonh/firebase-mcp@latest"],
    			"env": {
    				"FIREBASE_SERVICE_ACCOUNT": "${FIREBASE_SERVICE_ACCOUNT_PATH}"
    			},
    			"inputs": {
    				"projectId": "chatup-ddcf8"
    			}
    		}
    	}
    }
    ```

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Instale o pacote globalmente (opcional)
npm install -g @gannonh/firebase-mcp
```

### Erro: "Service account file not found"

-   Verifique se o caminho está correto
-   Use caminho absoluto em vez de relativo
-   Verifique as permissões do arquivo

### Erro: "Permission denied"

```bash
# Ajuste as permissões
chmod 600 ~/.firebase/chatup-ddcf8-service-account.json
```

### Servidor MCP não aparece

1. Verifique se o arquivo `mcp.json` está no local correto
2. Verifique a sintaxe JSON (use um validador JSON)
3. Reinicie o Cursor completamente
4. Verifique os logs do Cursor para erros

### Verificar Logs

No Cursor, você pode verificar os logs:

-   Abra o Developer Tools: `Help` → `Toggle Developer Tools`
-   Procure por erros relacionados ao MCP

## ✅ Verificação Final

Após configurar, você deve conseguir:

1. ✅ Ver o servidor MCP `firebase` ativo nas configurações
2. ✅ Usar comandos do Firebase através do Cursor
3. ✅ O Cursor pode acessar dados do Firestore
4. ✅ O Cursor pode gerenciar autenticação
5. ✅ O Cursor pode interagir com Storage

## 📚 Recursos Adicionais

-   [Documentação MCP](https://modelcontextprotocol.io/)
-   [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
-   [Service Accounts](https://firebase.google.com/docs/admin/setup#initialize-sdk)
-   [@gannonh/firebase-mcp no npm](https://www.npmjs.com/package/@gannonh/firebase-mcp)

## 🎯 Próximos Passos

Após configurar o MCP:

1. Teste a conexão fazendo uma pergunta ao Cursor sobre seus dados do Firebase
2. Use o Cursor para consultar dados do Firestore
3. Peça ao Cursor para criar/atualizar documentos
4. Explore as funcionalidades disponíveis através do MCP

---

**Nota**: O MCP permite que o Cursor tenha acesso direto aos seus dados do Firebase, então use com cuidado e sempre verifique as operações antes de executá-las em produção.
