# 🔧 Como Corrigir o Erro de OAuth do Google

O erro "Error 400: invalid_request" ocorre porque o redirect URI não está configurado corretamente no Google Cloud Console.

## 📋 Passos para Corrigir

### 1. Obter o Redirect URI do Expo

Primeiro, você precisa descobrir qual é o redirect URI que o Expo está gerando. Execute o app e verifique os logs no console. Você verá algo como:

```
📋 Redirect URI: exp://192.168.0.13:8083
```

**OU** se estiver usando o proxy do Expo:
```
📋 Redirect URI: https://auth.expo.io/@anonymous/...
```

### 2. Acessar o Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o projeto do Firebase (o mesmo que você está usando no Firebase Console)
3. No menu lateral, vá em **"APIs e Serviços"** → **"Credenciais"**

### 3. Configurar o OAuth Client

1. Encontre o **"Web client ID"** que você está usando (o mesmo do `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)
2. Clique no nome do OAuth 2.0 Client ID para editar
3. Na seção **"URIs de redirecionamento autorizados"**, adicione:

**⚠️ IMPORTANTE**: O Google **NÃO aceita** URIs com IP local (como `exp://192.168.0.13:8083`). Você **DEVE** usar o proxy do Expo:

```
https://auth.expo.io/@anonymous/chatup
```

**OU** para aceitar qualquer app Expo:

```
https://auth.expo.io/@anonymous/*
```

**Por que não funciona com IP local?**
- O Google OAuth requer domínios públicos válidos (como .com, .org, etc.)
- URIs com IP local não são aceitos por questões de segurança
- O proxy do Expo (`https://auth.expo.io`) é um domínio público válido que funciona perfeitamente

### 4. Adicionar Múltiplos Redirect URIs (Recomendado)

Para garantir que funcione em diferentes ambientes, adicione estes URIs (todos são domínios públicos válidos):

```
https://auth.expo.io/@anonymous/chatup
https://auth.expo.io/@anonymous/*
https://chatup-ddcf8.firebaseapp.com/_/auth/handler
```

**⚠️ NÃO adicione URIs com IP local** (como `exp://192.168.0.13:8083`) - eles serão rejeitados pelo Google.

### 5. Salvar e Testar

1. Clique em **"Salvar"**
2. Aguarde alguns minutos para as mudanças serem propagadas
3. Tente fazer login com Google novamente

## 🔍 Verificar o Redirect URI Atual

Para ver qual redirect URI está sendo usado, adicione este log no código ou verifique o console quando tentar fazer login:

```typescript
const redirectUri = AuthSession.makeRedirectUri({
  useProxy: true,
});
console.log("📋 Redirect URI:", redirectUri);
```

## ⚠️ Alternativa: Usar o Firebase Auth SDK Diretamente

Se continuar com problemas, podemos usar o Firebase Auth SDK diretamente, que gerencia os redirect URIs automaticamente. Isso requer uma configuração diferente, mas é mais confiável.

## 📝 Notas Importantes

- O redirect URI deve corresponder **exatamente** ao que está no código
- Mudanças no Google Cloud Console podem levar alguns minutos para serem aplicadas
- Certifique-se de que o **Web Client ID** está correto no arquivo `.env`
- O projeto no Google Cloud Console deve ser o mesmo do Firebase

