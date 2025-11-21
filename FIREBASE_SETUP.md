# 🔥 Guia de Configuração do Firebase

Este guia fornece todos os passos necessários para configurar o Firebase no projeto ChatUp.

## 📋 Pré-requisitos

- Conta Google
- Acesso ao [Firebase Console](https://console.firebase.google.com/)

## 🚀 Passo a Passo

### 1. Criar Projeto no Firebase Console

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"** ou **"Create a project"**
3. Preencha o nome do projeto (ex: `chatup`)
4. Clique em **"Continuar"**
5. (Opcional) Configure o Google Analytics:
   - Escolha se deseja habilitar o Google Analytics
   - Se sim, selecione ou crie uma conta do Google Analytics
   - Clique em **"Continuar"**
6. Clique em **"Criar projeto"**
7. Aguarde a criação do projeto (pode levar alguns segundos)
8. Clique em **"Continuar"** quando estiver pronto

### 2. Adicionar Aplicativo Web ao Projeto

1. No painel do projeto, clique no ícone **Web** (`</>`) ou em **"Adicionar app"** → **"Web"**
2. Preencha o nome do app (ex: `ChatUp Web`)
3. (Opcional) Marque a opção **"Também configurar o Firebase Hosting"** se desejar
4. Clique em **"Registrar app"**
5. **IMPORTANTE**: Copie as credenciais que aparecem na tela. Você verá algo como:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX" // Opcional
};
```

### 3. Configurar Authentication (Autenticação)

1. No menu lateral, clique em **"Authentication"** ou **"Autenticação"**
2. Clique em **"Começar"** ou **"Get started"**
3. Na aba **"Sign-in method"** ou **"Métodos de login"**, habilite os métodos desejados:
   - **Email/Password**: Clique em "Email/Password" → Ative → Salvar
   - **Google**: 
     - Clique em "Google" → Ative
     - **IMPORTANTE**: Copie o **"Web client ID"** que aparece na tela (você precisará dele depois)
     - Configure o email de suporte do projeto (opcional)
     - Clique em **"Salvar"**
   - **Outros métodos**: Facebook, Twitter, etc. (conforme necessário)

### 4. Configurar Firestore Database

1. No menu lateral, clique em **"Firestore Database"** ou **"Firestore"**
2. Clique em **"Criar banco de dados"** ou **"Create database"**
3. Escolha o modo:
   - **Modo de produção**: Regras mais restritivas (recomendado para produção)
   - **Modo de teste**: Regras mais permissivas (apenas para desenvolvimento)
4. Selecione a localização do banco de dados (ex: `southamerica-east1` para Brasil)
5. Clique em **"Habilitar"** ou **"Enable"**

#### Configurar Regras de Segurança (Importante!)

1. Na aba **"Regras"** ou **"Rules"**, configure as regras básicas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para mensagens de chat
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
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

> 📖 **Nota**: Para mais detalhes sobre a estrutura de dados do chat, consulte [FIRESTORE_CHAT_SETUP.md](./FIRESTORE_CHAT_SETUP.md)

2. Clique em **"Publicar"** ou **"Publish"**

### 5. Configurar Storage (Opcional, mas recomendado)

1. No menu lateral, clique em **"Storage"** ou **"Armazenamento"**
2. Clique em **"Começar"** ou **"Get started"**
3. Revise as regras de segurança e clique em **"Próximo"**
4. Escolha a localização do Storage (pode ser a mesma do Firestore)
5. Clique em **"Concluído"** ou **"Done"**

#### Configurar Regras de Storage

1. Na aba **"Regras"** ou **"Rules"**, configure:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir upload/download apenas para usuários autenticados
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Ou regras mais específicas:
    // match /users/{userId}/{allPaths=**} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
  }
}
```

2. Clique em **"Publicar"** ou **"Publish"**

### 6. Configurar Variáveis de Ambiente no Projeto

1. No diretório raiz do projeto, copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

2. Abra o arquivo `.env` e preencha com as credenciais do Firebase que você copiou no passo 2:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Google OAuth (obtido no passo 3 - Authentication > Sign-in method > Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=seu-web-client-id.apps.googleusercontent.com
```

3. **IMPORTANTE**: 
   - Substitua todos os valores pelos valores reais do seu projeto Firebase
   - O `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` é o **Web client ID** que você copiou ao habilitar o Google Sign-In no Firebase

### 7. Verificar Instalação

1. Reinicie o servidor de desenvolvimento do Expo:

```bash
npm start
```

2. Verifique no console se aparecem as mensagens:
   - ✅ Firebase inicializado com sucesso
   - ✅ Firebase Auth inicializado com sucesso
   - ✅ Firestore inicializado com sucesso
   - ✅ Firebase Storage inicializado com sucesso

## 📦 Objetos e Serviços Disponíveis

Após a configuração, você terá acesso aos seguintes objetos no projeto:

### Importações

```typescript
import { app, auth, db, storage } from '@/core/firebase';
```

### Objetos Disponíveis

1. **`app`**: Instância do Firebase App
   - Tipo: `FirebaseApp`
   - Uso: Configuração principal do Firebase

2. **`auth`**: Serviço de Autenticação
   - Tipo: `Auth`
   - Uso: Login, logout, gerenciamento de usuários
   - Exemplo:
   ```typescript
   import { signInWithEmailAndPassword } from 'firebase/auth';
   import { auth } from '@/core/firebase';
   
   await signInWithEmailAndPassword(auth, email, password);
   ```

3. **`db`**: Instância do Firestore
   - Tipo: `Firestore`
   - Uso: Banco de dados NoSQL
   - Exemplo:
   ```typescript
   import { collection, getDocs } from 'firebase/firestore';
   import { db } from '@/core/firebase';
   
   const querySnapshot = await getDocs(collection(db, 'users'));
   ```

4. **`storage`**: Serviço de Storage
   - Tipo: `FirebaseStorage`
   - Uso: Upload/download de arquivos
   - Exemplo:
   ```typescript
   import { ref, uploadBytes } from 'firebase/storage';
   import { storage } from '@/core/firebase';
   
   const storageRef = ref(storage, 'images/photo.jpg');
   await uploadBytes(storageRef, file);
   ```

## 🔒 Segurança

### Regras do Firestore

Configure regras apropriadas para produção. Exemplo básico:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só podem ler/escrever seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Mensagens: usuários autenticados podem ler/escrever
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Regras do Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Usuários só podem acessar seus próprios arquivos
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🐛 Troubleshooting

### Erro: "Firebase: Variáveis de ambiente faltando"

- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se todas as variáveis começam com `EXPO_PUBLIC_`
- Reinicie o servidor do Expo após modificar o `.env`

### Erro: "Firebase App named '[DEFAULT]' already exists"

- Isso é normal se o Firebase já foi inicializado
- O código já trata esse caso automaticamente

### Erro de permissão no Firestore/Storage

- Verifique as regras de segurança no Firebase Console
- Certifique-se de que o usuário está autenticado antes de fazer operações

## 📚 Recursos Adicionais

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Expo + Firebase](https://docs.expo.dev/guides/using-firebase/)

## ✅ Checklist de Configuração

- [ ] Projeto criado no Firebase Console
- [ ] Aplicativo Web adicionado ao projeto
- [ ] Credenciais copiadas
- [ ] Authentication configurado
- [ ] Firestore Database criado e regras configuradas
- [ ] Storage configurado (opcional)
- [ ] Arquivo `.env` criado e preenchido
- [ ] Servidor reiniciado
- [ ] Mensagens de sucesso aparecem no console

