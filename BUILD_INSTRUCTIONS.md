# 📱 Instruções para Gerar APK de Produção

Este guia explica como gerar um APK de produção para instalar no celular Android.

## 🚀 Método 1: EAS Build (Recomendado - Na Nuvem)

O EAS Build é o método recomendado pela Expo. Ele compila o app na nuvem e você baixa o APK pronto.

### Pré-requisitos

1. **Instalar EAS CLI globalmente:**

    ```bash
    npm install -g eas-cli
    ```

2. **Fazer login na sua conta Expo:**

    ```bash
    npm run eas:login
    ```

    Ou se não tiver conta:

    ```bash
    npx eas-cli login
    ```

3. **Configurar o projeto (primeira vez):**
    ```bash
    npm run eas:setup
    ```
    Isso criará o arquivo `eas.json` (já está criado, mas pode atualizar).

### Gerar APK de Produção

**Opção A: Build na nuvem (mais fácil):**

```bash
npm run build:android:apk:cloud
```

**Opção B: Build local (requer Android SDK):**

```bash
npm run build:android:apk
```

### Gerar AAB para Play Store

Se quiser publicar na Play Store, use o formato AAB:

```bash
npm run build:android:aab:cloud
```

### Após o Build

1. O build será processado na nuvem (pode levar 10-20 minutos)
2. Você receberá um link para baixar o APK
3. Baixe o APK e instale no celular

## 🔧 Método 2: Build Local (Avançado)

Se preferir compilar localmente, você precisa:

1. **Instalar Android Studio e configurar o ambiente:**

    - Android SDK
    - Java JDK
    - Variáveis de ambiente configuradas

2. **Gerar keystore (primeira vez):**

    ```bash
    npx eas-cli build:configure
    ```

3. **Build local:**
    ```bash
    npm run build:android:apk
    ```

## 📋 Scripts Disponíveis

-   `npm run build:android:apk` - Build APK local
-   `npm run build:android:apk:cloud` - Build APK na nuvem (recomendado)
-   `npm run build:android:aab` - Build AAB local (Play Store)
-   `npm run build:android:aab:cloud` - Build AAB na nuvem (Play Store)
-   `npm run build:ios` - Build para iOS
-   `npm run build:all` - Build para todas as plataformas
-   `npm run eas:login` - Fazer login no EAS
-   `npm run eas:logout` - Fazer logout do EAS
-   `npm run eas:setup` - Configurar projeto EAS
-   `npm run eas:whoami` - Verificar usuário logado

## ⚙️ Configurações Importantes

### Variáveis de Ambiente

Certifique-se de que todas as variáveis de ambiente estão configuradas no arquivo `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

### Assinatura do APK

Na primeira vez, o EAS vai perguntar sobre a assinatura:

-   **Opção 1:** Deixar o EAS gerenciar (mais fácil)
-   **Opção 2:** Usar seu próprio keystore (mais controle)

## 📦 Instalar APK no Celular

1. **Transferir o APK para o celular:**

    - Via USB
    - Via email
    - Via Google Drive/Dropbox
    - Via QR Code (EAS fornece)

2. **Habilitar instalação de fontes desconhecidas:**

    - Android: Configurações > Segurança > Fontes desconhecidas (ou similar)
    - Varia conforme a versão do Android

3. **Instalar:**
    - Abra o arquivo APK no celular
    - Toque em "Instalar"
    - Aguarde a instalação

## 🔍 Verificar Build

Para verificar o status do build:

```bash
eas build:list
```

## 🔄 Trocar Conta do EAS

Se você já está logado com outra conta e quer trocar:

1. **Fazer logout:**

    ```bash
    npm run eas:logout
    ```

2. **Fazer login com a nova conta:**

    ```bash
    npm run eas:login
    ```

3. **Verificar qual conta está logada:**
    ```bash
    npm run eas:whoami
    ```

## 🐛 Troubleshooting

### Erro: "Not logged in"

```bash
npm run eas:login
```

### Quer trocar de conta

```bash
npm run eas:logout
npm run eas:login
```

### Erro: "Project not configured"

```bash
npm run eas:setup
```

### Erro: Variáveis de ambiente não encontradas

-   Verifique se o arquivo `.env` existe
-   Certifique-se de que as variáveis começam com `EXPO_PUBLIC_`

### Build falha com erros de dependências (ERESOLVE)

Se você receber erros como:

-   `ERESOLVE could not resolve`
-   `Conflicting peer dependency`
-   Problemas com `lucide-react-native` ou `@react-native-async-storage/async-storage`

**Solução:** O arquivo `.npmrc` já foi criado com `legacy-peer-deps=true` para resolver isso. Se o erro persistir:

1. **Verifique se o arquivo `.npmrc` existe na raiz do projeto:**

    ```bash
    cat .npmrc
    ```

    Deve conter: `legacy-peer-deps=true`

2. **Se o erro persistir, você pode precisar atualizar as dependências:**

    ```bash
    npm install --legacy-peer-deps
    npm run check:deps
    ```

3. **Commit e push do `.npmrc`:**
    ```bash
    git add .npmrc
    git commit -m "Add .npmrc for legacy peer deps"
    git push
    ```

### Build falha

-   Verifique os logs: `eas build:view`
-   Certifique-se de que todas as dependências estão instaladas
-   Verifique se há erros de lint/TypeScript
-   Verifique se o arquivo `.npmrc` está commitado no repositório

## 📚 Documentação Adicional

-   [EAS Build Docs](https://docs.expo.dev/build/introduction/)
-   [Expo Build Guide](https://docs.expo.dev/build/building-on-ci/)
