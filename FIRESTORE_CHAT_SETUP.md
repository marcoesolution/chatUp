# 🔥 Configuração do Firestore para Chat em Tempo Real

Este documento descreve a estrutura do banco de dados Firestore para o sistema de chat em tempo real.

## 📊 Estrutura de Dados

### Coleção: `messages`

Cada documento representa uma mensagem entre dois usuários.

```typescript
{
  id: string; // ID do documento (gerado automaticamente)
  chatId: string; // ID único do chat (formato: "userId1_userId2" ordenado)
  senderId: string; // ID do usuário que enviou a mensagem
  receiverId: string; // ID do usuário que recebeu a mensagem
  text: string; // Conteúdo da mensagem (texto plano)
  timestamp: Timestamp; // Data/hora da mensagem
  read: boolean; // Se a mensagem foi lida
  createdAt: Timestamp; // Data de criação
  updatedAt: Timestamp; // Data de atualização
}
```

**Exemplo:**
```json
{
  "chatId": "user123_user456",
  "senderId": "user123",
  "receiverId": "user456",
  "text": "Olá! Como você está?",
  "timestamp": "2024-01-15T10:30:00Z",
  "read": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Geração do `chatId`

O `chatId` é gerado combinando os IDs dos dois usuários de forma ordenada:

```typescript
function generateChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
```

Isso garante que o mesmo chat tenha o mesmo ID, independente de qual usuário iniciou a conversa.

## 🔒 Regras de Segurança do Firestore

Adicione estas regras no Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para mensagens
    match /messages/{messageId} {
      // Permitir leitura apenas se o usuário for o remetente ou destinatário
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.receiverId);
      
      // Permitir criação apenas se o usuário for o remetente
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.senderId &&
        request.resource.data.receiverId != request.auth.uid &&
        request.resource.data.text is string &&
        request.resource.data.text.size() > 0 &&
        request.resource.data.text.size() <= 1000 &&
        request.resource.data.chatId is string &&
        request.resource.data.read == false;
      
      // Permitir atualização apenas para marcar como lida
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.receiverId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read', 'updatedAt']) &&
        request.resource.data.read == true;
      
      // Não permitir exclusão de mensagens
      allow delete: if false;
    }
    
    // Regras para usuários (já existentes)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📝 Índices Necessários

O Firestore pode solicitar a criação de índices compostos. Se aparecer um erro ao fazer queries, crie os índices solicitados:

1. **Índice para buscar mensagens por chatId:**
   - Collection: `messages`
   - Fields: `chatId` (Ascending), `timestamp` (Ascending)
   - Query scope: Collection

2. **Índice para buscar mensagens não lidas:**
   - Collection: `messages`
   - Fields: `chatId` (Ascending), `receiverId` (Ascending), `read` (Ascending)
   - Query scope: Collection

## 🚀 Como Aplicar as Regras

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database** > **Rules**
4. Cole as regras acima
5. Clique em **Publicar**

## ✅ Funcionalidades Implementadas

- ✅ Envio de mensagens em tempo real
- ✅ Recebimento de mensagens em tempo real (usando `onSnapshot`)
- ✅ Marcação automática de mensagens como lidas ao abrir o chat
- ✅ Limite de 100 mensagens por query (pode ser aumentado)
- ✅ Validação de mensagens (não vazias, máximo 1000 caracteres)
- ✅ Ordenação por timestamp
- ✅ Geração automática de `chatId` único

## 🔄 Próximos Passos (Futuro)

- [ ] Paginação de mensagens (carregar mais ao rolar para cima)
- [ ] Indicadores de digitação
- [ ] Status de entrega (enviado, entregue, lido)
- [ ] Suporte a mídia (imagens, arquivos)
- [ ] Criptografia end-to-end
- [ ] Notificações push
- [ ] Cloud Functions para atualizar última mensagem do chat

