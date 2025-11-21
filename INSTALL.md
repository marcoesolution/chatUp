# Guia de Instalação

## Instalação das Dependências

⚠️ **Importante**: O Expo SDK 54 usa React 19.1.0, que pode causar conflitos de peer dependencies. Use `--legacy-peer-deps` para resolver.

### Instalação Recomendada

```bash
npm install --legacy-peer-deps
```

Isso instalará todas as dependências com as versões corretas compatíveis com o Expo SDK 54.

### Verificar Versões

Após a instalação, verifique se todas as versões estão corretas:

```bash
npx expo install --check
```

Se houver alguma versão incorreta, o Expo mostrará quais pacotes precisam ser atualizados.

### Atualizar Versões do Expo

Se o `expo install --check` mostrar versões incorretas, você pode corrigir manualmente editando o `package.json` ou usando:

```bash
npx expo install --fix
```

**Nota**: O comando `expo install --fix` pode falhar devido a conflitos de peer dependencies. Nesse caso, use `npm install --legacy-peer-deps` após atualizar o `package.json`.

## Resolução de Problemas

### Erro de versão do React

Se você encontrar erros relacionados à versão do React, certifique-se de que:

1. `react` e `react-test-renderer` estão na mesma versão (18.3.1)
2. `@types/react` corresponde à versão do React (18.3.12)

### Erro de peer dependencies

Se houver conflitos de peer dependencies, você pode:

1. Usar `npm install --legacy-peer-deps`
2. Ou usar `npm install --force` (não recomendado)

### Limpar cache

Se você encontrar problemas persistentes:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

