# 🔒 Regras do Firestore para Localização

Este documento descreve as regras de segurança do Firestore necessárias para a funcionalidade de contatos por proximidade.

## 📋 Regras Atualizadas

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
    
    // Regras para usuários
    match /users/{userId} {
      // Permitir leitura de perfil básico e localização para usuários autenticados
      // Isso permite que usuários vejam outros usuários próximos
      allow read: if request.auth != null;
      
      // Permitir escrita apenas do próprio perfil
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Validação ao atualizar localização
      allow update: if request.auth != null && 
        request.auth.uid == userId &&
        // Validar estrutura de localização se presente
        (!request.resource.data.keys().hasAny(['location']) || 
         (request.resource.data.location is map &&
          request.resource.data.location.latitude is float &&
          request.resource.data.location.longitude is float &&
          request.resource.data.location.latitude >= -90 &&
          request.resource.data.location.latitude <= 90 &&
          request.resource.data.location.longitude >= -180 &&
          request.resource.data.location.longitude <= 180));
    }
  }
}
```

## 🔐 Segurança

### Localização
- **Leitura**: Qualquer usuário autenticado pode ler a localização de outros usuários
  - Isso é necessário para mostrar usuários próximos
  - Apenas coordenadas (latitude/longitude) são expostas, não endereços exatos
- **Escrita**: Apenas o próprio usuário pode atualizar sua localização
  - Validação de coordenadas válidas (latitude: -90 a 90, longitude: -180 a 180)

### Mensagens
- Mantidas as regras existentes de segurança
- Apenas remetente e destinatário podem ler mensagens

## 📝 Estrutura de Dados

### Documento `users/{userId}`

```typescript
{
  // Campos existentes
  email: string;
  displayName: string;
  photoURL?: string;
  hasProfile: boolean;
  // ... outros campos
  
  // Novos campos de localização
  location?: {
    latitude: number;  // -90 a 90
    longitude: number; // -180 a 180
    updatedAt: Timestamp;
  };
  isLocationEnabled: boolean; // sempre true (obrigatório)
}
```

## 🚀 Como Aplicar

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database** > **Rules**
4. Substitua as regras existentes pelas regras acima
5. Clique em **Publicar**

## ⚠️ Importante

- As regras permitem que qualquer usuário autenticado leia a localização de outros usuários
- Isso é necessário para a funcionalidade de contatos por proximidade
- Apenas coordenadas são expostas, não endereços completos
- Usuários só podem atualizar sua própria localização

## 🔄 Próximos Passos (Otimizações Futuras)

- [ ] Implementar Geohash para queries mais eficientes
- [ ] Usar Cloud Functions para cálculos de proximidade
- [ ] Adicionar opção de privacidade (usuário pode desativar compartilhamento)
- [ ] Limitar atualização de localização (rate limiting)

