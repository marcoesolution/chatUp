# ⚡ Solução Rápida: Build Falhando

## 🎯 Solução Recomendada: Build na Nuvem

O build local pode falhar por problemas de configuração do Android SDK. **Use o build na nuvem que é mais confiável:**

```bash
npm run build:android:apk:cloud
```

## 🔧 Se Quiser Tentar Build Local Novamente

### Opção 1: Limpar e Tentar Novamente

```bash
# Limpar tudo
npm run clean
npm run clean:build

# Reinstalar
npm install --legacy-peer-deps

# Tentar build novamente
npm run build:android:apk
```

### Opção 2: Usar Script de Correção

```bash
./fix-gradle-build.sh
npm run build:android:apk
```

## ⚠️ Problemas Comuns do Build Local

1. **Android SDK não configurado corretamente**
2. **Java não instalado ou versão errada**
3. **Cache corrompido**
4. **Variáveis de ambiente não configuradas**

## ✅ Por Que Build na Nuvem é Melhor

- ✅ Não requer Android SDK local
- ✅ Ambiente pré-configurado
- ✅ Mais rápido (geralmente)
- ✅ Menos problemas de compatibilidade
- ✅ Funciona em qualquer sistema operacional

## 🚀 Comando Rápido

```bash
# Build na nuvem (RECOMENDADO)
npm run build:android:apk:cloud
```

Isso vai gerar o APK na nuvem e você receberá um link para download.

