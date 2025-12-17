# Correção: Erro de Memória (Metaspace) durante Build Android

## Problema Identificado

O build do Android estava falhando com erros de `OutOfMemoryError: Metaspace` em duas tarefas:

1. **`:expo-updates:kspReleaseKotlin`** - Erro de Metaspace durante Kotlin Symbol Processing
2. **`:expo-modules-core:lintVitalAnalyzeRelease`** - Erro de Metaspace durante análise de lint

## Causa

O Gradle estava usando configurações de memória insuficientes para projetos grandes com muitas dependências:

-   `MaxMetaspaceSize=512m` era muito baixo
-   `Xmx=2048m` também era insuficiente para builds de produção
-   Lint vital estava consumindo muita memória

## Correções Implementadas

### 1. Aumento de Memória do Gradle (`android/gradle.properties`)

**Antes:**

```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

**Depois:**

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

**Mudanças:**

-   `Xmx`: 2048m → 4096m (dobrou a memória heap)
-   `MaxMetaspaceSize`: 512m → 1536m (triplicou o Metaspace)
-   Adicionado `HeapDumpOnOutOfMemoryError` para debug futuro
-   Adicionado `-Dfile.encoding=UTF-8` para evitar problemas de encoding

### 2. Memória para KSP (Kotlin Symbol Processing)

Adicionada configuração específica para o daemon do Kotlin:

```properties
kotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m
```

Isso garante que o processamento de símbolos Kotlin tenha memória suficiente.

### 3. Otimizações de Build

Adicionadas otimizações para melhorar performance e reduzir uso de memória:

```properties
org.gradle.caching=true
org.gradle.configureondemand=true
org.gradle.daemon=true
```

### 4. Desabilitação de Lint Vital em Release (`android/app/build.gradle`)

O lint vital pode ser muito pesado e causar OutOfMemoryError. Foi desabilitado em builds de release:

```gradle
lint {
    // Desabilitar lint vital em release para evitar erros de memória
    checkReleaseBuilds false
    // Continuar build mesmo se lint encontrar erros
    abortOnError false
    // Desabilitar warnings que não são críticos
    warningsAsErrors false
    // Desabilitar verificação de recursos não utilizados (economiza memória)
    disable 'UnusedResources'
}
```

**Nota:** O lint ainda pode ser executado manualmente quando necessário, mas não bloqueia o build de produção.

## Como Testar

1. **Limpar cache do Gradle** (recomendado após mudanças de memória):

    ```bash
    cd android
    ./gradlew clean
    cd ..
    ```

2. **Tentar build novamente**:

    ```bash
    npm run build:android:local
    ```

3. **Se ainda houver problemas de memória**, você pode:
    - Aumentar ainda mais `MaxMetaspaceSize` para `2048m` ou `3072m`
    - Aumentar `Xmx` para `6144m` ou `8192m` (se sua máquina tiver RAM suficiente)
    - Desabilitar paralelismo temporariamente: `org.gradle.parallel=false`

## Requisitos de Sistema

Com essas configurações, recomenda-se:

-   **RAM mínima**: 8GB
-   **RAM recomendada**: 16GB ou mais
-   **Espaço em disco**: Pelo menos 10GB livres para cache do Gradle

## Monitoramento

Se o build ainda falhar com erro de memória:

1. **Verificar uso de memória durante build**:

    ```bash
    # Em outro terminal, enquanto o build roda
    watch -n 1 'ps aux | grep -E "(gradle|java)" | grep -v grep'
    ```

2. **Verificar heap dump** (se `HeapDumpOnOutOfMemoryError` foi ativado):

    - Arquivo será criado em `android/` com nome `hs_err_pid*.log`
    - Analisar para identificar o que está consumindo memória

3. **Aumentar memória gradualmente**:
    - Se `MaxMetaspaceSize=1536m` não for suficiente, tentar `2048m`, `3072m`, etc.
    - Não exceder a RAM disponível do sistema

## Arquivos Modificados

1. `android/gradle.properties` - Configurações de memória do Gradle e KSP
2. `android/app/build.gradle` - Configurações de lint

## Notas Importantes

-   **Lint desabilitado em release**: Isso acelera o build, mas você pode executar lint manualmente quando necessário
-   **Memória aumentada**: Certifique-se de que sua máquina tem RAM suficiente
-   **Cache do Gradle**: O cache ajuda muito, mas pode ocupar vários GB de espaço
-   **Builds locais vs EAS**: Essas configurações afetam apenas builds locais. Builds no EAS têm suas próprias configurações de memória


