# 🔧 Correção de Erros do Gradle Build

## Erro Comum: "Gradle build failed with unknown error"

### Solução Rápida

Execute o script de correção:
```bash
./fix-gradle-build.sh
```

Ou manualmente:

### 1. Limpar Cache e Reinstalar

```bash
# Limpar cache do npm
npm cache clean --force

# Remover node_modules
rm -rf node_modules

# Reinstalar dependências
npm install --legacy-peer-deps

# Limpar cache do Expo
npx expo start --clear
```

### 2. Verificar Variáveis de Ambiente

```bash
# Verificar ANDROID_HOME
echo $ANDROID_HOME

# Se não estiver configurado:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

# Adicionar ao ~/.bashrc ou ~/.zshrc para persistir
```

### 3. Verificar Java

```bash
java -version
# Deve ser Java 17 ou superior
```

### 4. Limpar Build do Gradle (se existir)

Se você já tentou build local antes:

```bash
# Se houver pasta android/ (gerada pelo prebuild)
rm -rf android/
rm -rf ios/

# Limpar cache do Gradle
rm -rf ~/.gradle/caches/
```

### 5. Tentar Build na Nuvem (Mais Confiável)

Se o build local continuar falhando, use o build na nuvem:

```bash
npm run build:android:apk:cloud
```

O build na nuvem é mais confiável porque:
- Não depende da configuração local do Android SDK
- Tem ambiente pré-configurado
- Menos problemas de compatibilidade

### 6. Verificar Logs Detalhados

Se quiser ver logs mais detalhados do Gradle:

```bash
# Build local com logs verbosos
EAS_LOCAL_BUILD_SKIP_CLEANUP=1 npm run build:android:apk 2>&1 | tee gradle-build.log
```

## Erros Específicos

### Erro: "ANDROID_HOME not set"
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Erro: "Java not found"
```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# Mac
brew install openjdk@17
```

### Erro: "Gradle daemon"
```bash
# Parar daemon do Gradle
cd android && ./gradlew --stop && cd ..
```

## Recomendação

**Para produção, use build na nuvem:**
```bash
npm run build:android:apk:cloud
```

É mais rápido, confiável e não requer configuração local complexa.

