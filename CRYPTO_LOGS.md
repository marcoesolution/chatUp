# 📊 Logs de Criptografia - Guia de Análise

Este documento descreve os logs de console adicionados para análise e teste da criptografia das mensagens.

## 🔍 Logs Disponíveis

### 1. **Geração/Recuperação de Chaves**

#### Chave Recuperada:
```
🔑 [CRYPTO] Chave recuperada do armazenamento
{
  chatId: "abc12345...",
  userId: "user1234...",
  keyHash: "0x1a2b3c4d5e6f7g8h",
  keyLength: 32
}
```

#### Chave Gerada:
```
🔐 [CRYPTO] Gerando nova chave para o chat
{
  chatId: "abc12345...",
  userId: "user1234..."
}

✅ [CRYPTO] Chave gerada com sucesso
{
  chatId: "abc12345...",
  keyHash: "0x1a2b3c4d5e6f7g8h",
  keyLength: 32,
  saltLength: 44,
  derivationTime: "150ms",
  pbkdf2Iterations: 100000
}
```

**O que observar:**
- `keyHash`: Hash da chave (primeiros 16 caracteres) - útil para verificar se a mesma chave é usada
- `derivationTime`: Tempo de derivação da chave (deve ser ~100-200ms)
- `pbkdf2Iterations`: Número de iterações (100.000 é seguro)

---

### 2. **Criptografia de Mensagens**

#### Início da Criptografia:
```
🔒 [ENCRYPT] Iniciando criptografia de mensagem
{
  chatId: "abc12345...",
  userId: "user1234...",
  plaintextLength: 25,
  plaintextPreview: "Olá! Como você está?"
}
```

#### Chave e IV Preparados:
```
🔐 [ENCRYPT] Chave e IV preparados
{
  keyHash: "0x1a2b3c4d5e6f7g8h",
  ivLength: 12,
  ivPreview: "aB3dE5fG7hI9jK..."
}
```

#### Mensagem Criptografada:
```
✅ [ENCRYPT] Mensagem criptografada
{
  ciphertextLength: 44,
  ciphertextPreview: "xY9zA2bC4dE6fG8hI0jK2lM4nO6pQ...",
  tagLength: 24,
  tagPreview: "1a2b3c4d5e6f7g8h...",
  encryptTime: "25ms"
}
```

#### Conclusão:
```
🎯 [ENCRYPT] Criptografia concluída
{
  originalLength: 25,
  encryptedLength: 120,
  expansionRatio: "4.80x",
  totalTime: "180ms",
  hasPrefix: true
}
```

**O que observar:**
- `plaintextPreview`: Texto original (primeiros 50 caracteres)
- `ciphertextPreview`: Texto criptografado (primeiros 32 caracteres)
- `expansionRatio`: Quanto a mensagem cresceu após criptografia (normalmente 3-5x)
- `encryptTime`: Tempo de criptografia (deve ser < 50ms)
- `hasPrefix`: Deve ser `true` (indica que tem o prefixo `ENC:`)

---

### 3. **Descriptografia de Mensagens**

#### Início da Descriptografia:
```
🔓 [DECRYPT] Iniciando descriptografia de mensagem
{
  chatId: "abc12345...",
  userId: "user1234...",
  encryptedLength: 120,
  hasPrefix: true
}
```

#### Mensagem Não Criptografada (Compatibilidade):
```
⚠️ [DECRYPT] Mensagem não criptografada (compatibilidade com mensagens antigas)
{
  textPreview: "Olá! Como você está?"
}
```

#### Payload Desofuscado:
```
🔍 [DECRYPT] Payload desofuscado
{
  obfuscatedLength: 115,
  deobfuscatedLength: 200
}
```

#### Payload Decodificado:
```
📦 [DECRYPT] Payload decodificado
{
  version: "1",
  timestamp: "2024-01-15T10:30:00.000Z",
  ivLength: 16,
  ciphertextLength: 44,
  tagLength: 24
}
```

#### Chave e IV Preparados:
```
🔐 [DECRYPT] Chave e IV preparados para descriptografia
{
  keyHash: "0x1a2b3c4d5e6f7g8h",
  ivLength: 12,
  ivPreview: "aB3dE5fG7hI9jK..."
}
```

#### Conclusão:
```
✅ [DECRYPT] Mensagem descriptografada com sucesso
{
  plaintextLength: 25,
  plaintextPreview: "Olá! Como você está?",
  decryptTime: "22ms",
  totalTime: "150ms"
}
```

**O que observar:**
- `version`: Deve ser "1" (versão do formato de criptografia)
- `timestamp`: Quando a mensagem foi criptografada
- `decryptTime`: Tempo de descriptografia (deve ser < 50ms)
- `plaintextPreview`: Deve corresponder ao texto original

---

### 4. **Operações AES (Baixo Nível)**

#### Criptografia AES:
```
🔐 [AES-ENCRYPT] Operação de criptografia concluída
{
  algorithm: "AES-256-CBC",
  plaintextBytes: 25,
  ciphertextBytes: 32,
  tagBytes: 32,
  ivBytes: 12,
  keyBytes: 32
}
```

#### Verificação de Tag HMAC:
```
🔍 [AES-DECRYPT] Verificando autenticidade da mensagem
{
  ciphertextBytes: 32,
  tagBytes: 32
}

✅ [AES-DECRYPT] Tag HMAC verificada com sucesso - mensagem autêntica
```

#### Erro na Verificação:
```
❌ [AES-DECRYPT] Verificação de tag HMAC falhou
{
  computedTagPreview: "1a2b3c4d5e6f7g8h...",
  providedTagPreview: "9z8y7x6w5v4u3t2s..."
}
```

#### Descriptografia AES:
```
✅ [AES-DECRYPT] Descriptografia concluída
{
  algorithm: "AES-256-CBC",
  ciphertextBytes: 32,
  decryptedBytes: 25
}
```

**O que observar:**
- `algorithm`: Sempre "AES-256-CBC"
- `tagBytes`: Tamanho da tag HMAC (32 bytes = 256 bits)
- Se a verificação de tag falhar, a mensagem foi alterada ou corrompida

---

### 5. **Envio de Mensagens**

#### Preparação:
```
📤 [SEND-MESSAGE] Preparando mensagem para envio
{
  chatId: "abc12345...",
  senderId: "user1234...",
  receiverId: "user5678...",
  plaintextLength: 25,
  plaintextPreview: "Olá! Como você está?"
}
```

#### Sucesso:
```
✅ [SEND-MESSAGE] Mensagem criptografada com sucesso
{
  originalLength: 25,
  encryptedLength: 120,
  willBeStored: true
}

✅ [SEND-MESSAGE] Mensagem enviada e armazenada no Firestore
{
  chatId: "abc12345...",
  messageId: "pending",
  isEncrypted: true,
  storedTextLength: 120
}
```

#### Erro:
```
❌ [SEND-MESSAGE] Erro ao criptografar mensagem: [erro]

⚠️ [SEND-MESSAGE] Enviando mensagem sem criptografia (fallback)
```

---

### 6. **Recebimento de Mensagens**

#### Processamento em Lote:
```
📥 [RECEIVE-MESSAGES] Processando mensagens recebidas
{
  totalMessages: 5,
  chatId: "abc12345...",
  currentUserId: "user1234..."
}
```

#### Mensagem Individual:
```
📨 [RECEIVE-MESSAGE] Processando mensagem individual
{
  messageId: "msg1234...",
  senderId: "user5678...",
  receiverId: "user1234...",
  isEncrypted: true,
  textLength: 120
}

✅ [RECEIVE-MESSAGE] Mensagem processada com sucesso
{
  messageId: "msg1234...",
  wasEncrypted: true,
  decryptedLength: 25
}
```

#### Erro:
```
⚠️ [RECEIVE-MESSAGE] Erro ao descriptografar mensagem, usando texto original
{
  messageId: "msg1234...",
  error: "Autenticação falhou: tag inválida",
  fallbackToOriginal: true
}
```

---

## 🧪 Como Testar a Confiabilidade

### Teste 1: Verificar Criptografia/Descriptografia
1. Envie uma mensagem
2. Verifique os logs `[ENCRYPT]` e `[SEND-MESSAGE]`
3. Verifique se `isEncrypted: true` no Firestore
4. Verifique os logs `[DECRYPT]` e `[RECEIVE-MESSAGE]`
5. Confirme que `plaintextPreview` corresponde ao texto original

### Teste 2: Verificar Integridade (HMAC)
1. Envie uma mensagem
2. Verifique o log `✅ [AES-DECRYPT] Tag HMAC verificada`
3. Se aparecer `❌ [AES-DECRYPT] Verificação de tag HMAC falhou`, a mensagem foi alterada

### Teste 3: Verificar Chaves Compartilhadas
1. Envie uma mensagem do usuário A para o usuário B
2. Verifique o `keyHash` nos logs de ambos os usuários
3. Os `keyHash` devem ser **iguais** (mesma chave para o mesmo chat)

### Teste 4: Verificar Performance
1. Envie várias mensagens
2. Verifique os tempos:
   - `encryptTime`: deve ser < 50ms
   - `decryptTime`: deve ser < 50ms
   - `derivationTime`: deve ser ~100-200ms (apenas primeira vez)

### Teste 5: Verificar Compatibilidade
1. Envie uma mensagem antiga (não criptografada)
2. Verifique o log `⚠️ [DECRYPT] Mensagem não criptografada`
3. A mensagem deve ser exibida normalmente

---

## 🔍 O que Procurar nos Logs

### ✅ Sinais de Funcionamento Correto:
- `hasPrefix: true` nas mensagens criptografadas
- `keyHash` igual para o mesmo chat
- `Tag HMAC verificada com sucesso`
- `plaintextPreview` corresponde ao texto original
- Tempos de criptografia/descriptografia < 50ms

### ⚠️ Sinais de Problemas:
- `❌ [AES-DECRYPT] Verificação de tag HMAC falhou` → Mensagem foi alterada
- `keyHash` diferentes para o mesmo chat → Problema na derivação de chaves
- `expansionRatio` muito alto (> 10x) → Possível problema na criptografia
- Tempos muito altos (> 500ms) → Problema de performance

---

## 📝 Notas Importantes

1. **Segurança dos Logs**: Os logs mostram apenas:
   - Hashes parciais das chaves (não a chave completa)
   - Previews dos textos (primeiros 50 caracteres)
   - IDs truncados (primeiros 8 caracteres)

2. **Produção**: Em produção, você pode querer:
   - Reduzir a verbosidade dos logs
   - Usar um sistema de logging estruturado
   - Filtrar logs sensíveis

3. **Debug**: Para debug mais detalhado, você pode:
   - Adicionar mais logs em pontos específicos
   - Logar o payload completo (cuidado com segurança)
   - Adicionar métricas de performance

---

## 🎯 Exemplo de Fluxo Completo

```
1. Usuário A envia "Olá!"
   → 🔒 [ENCRYPT] Iniciando criptografia
   → 🔐 [ENCRYPT] Chave e IV preparados
   → ✅ [ENCRYPT] Mensagem criptografada
   → 🎯 [ENCRYPT] Criptografia concluída
   → 📤 [SEND-MESSAGE] Preparando mensagem
   → ✅ [SEND-MESSAGE] Mensagem enviada

2. Usuário B recebe a mensagem
   → 📥 [RECEIVE-MESSAGES] Processando mensagens
   → 📨 [RECEIVE-MESSAGE] Processando mensagem individual
   → 🔓 [DECRYPT] Iniciando descriptografia
   → 🔍 [DECRYPT] Payload desofuscado
   → 📦 [DECRYPT] Payload decodificado
   → 🔐 [DECRYPT] Chave e IV preparados
   → 🔍 [AES-DECRYPT] Verificando autenticidade
   → ✅ [AES-DECRYPT] Tag HMAC verificada
   → ✅ [AES-DECRYPT] Descriptografia concluída
   → ✅ [DECRYPT] Mensagem descriptografada
   → ✅ [RECEIVE-MESSAGE] Mensagem processada
```

---

**Status**: ✅ **Logs Implementados e Prontos para Análise**

Todos os logs estão ativos e fornecem informações detalhadas sobre o processo de criptografia/descriptografia.

