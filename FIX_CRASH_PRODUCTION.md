# Fix: App Crashando no Login em Produção

## Problema Identificado

O app está crashando ao fazer login no dispositivo físico com build de produção. A causa mais provável é o **ProGuard/R8** removendo classes essenciais do Firebase e outras dependências.

## Soluções Implementadas

### 1. Arquivo ProGuard Rules

Criado arquivo `android/app/proguard-rules.pro` com regras para manter classes essenciais:
- Firebase (Auth, Firestore, Storage)
- React Native
- Expo modules
- Outras dependências críticas

### 2. Configuração do ProGuard

Adicionado `proguardFiles: ["proguard-rules.pro"]` em:
- `app.json`
- `app.config.js`

### 3. Melhorias no ErrorBoundary

Melhorado logging de erros para facilitar debug em produção.

## Próximos Passos

### 1. Rebuild do APK

```bash
npm run build:android:apk
```

### 2. Verificar Logs do Crash

Se ainda crashar, capture os logs:

```bash
# Conectar dispositivo via USB
adb logcat | grep -i "chatup\|firebase\|error\|fatal"
```

Ou use:
```bash
adb logcat *:E AndroidRuntime:E > crash.log
```

### 3. Verificar Google Sign-In (se usar)

Se o crash ocorrer especificamente no login com Google, verifique:

1. **SHA-1/SHA-256 do certificado de release**:
   ```bash
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

2. **Adicionar SHA no Firebase Console**:
   - Firebase Console > Authentication > Sign-in method > Google
   - Adicionar SHA-1 e SHA-256 do certificado de release

3. **Configurar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID**:
   - Adicionar no `eas.json` no profile `production`:
   ```json
   "env": {
     "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "seu-web-client-id-aqui"
   }
   ```

### 4. Testar Build de Preview Primeiro

Antes de testar produção, teste com preview:

```bash
npm run build:android:apk:preview
```

O preview tem menos otimizações e pode ajudar a identificar o problema.

## Possíveis Causas Adicionais

1. **Variáveis de ambiente não configuradas**: Verificar se todas as variáveis do Firebase estão no `eas.json`
2. **Google Services não configurado**: Verificar se `google-services.json` está presente (gerado automaticamente pelo Expo)
3. **Permissões**: Verificar se todas as permissões necessárias estão no `app.json`

## Debug Adicional

Se o problema persistir:

1. **Desabilitar ProGuard temporariamente** (apenas para teste):
   ```json
   "enableProguardInReleaseBuilds": false
   ```

2. **Verificar se funciona sem ProGuard**: Se funcionar, o problema está nas regras do ProGuard

3. **Adicionar mais regras**: Se necessário, adicionar regras específicas para classes que estão sendo removidas

## Arquivos Modificados

- `android/app/proguard-rules.pro` (criado)
- `app.json` (adicionado proguardFiles)
- `app.config.js` (adicionado proguardFiles)
- `app/_layout.tsx` (melhorado ErrorBoundary)


