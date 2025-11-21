# Arquitetura do Projeto ChatUp

## Visão Geral

Este projeto implementa uma arquitetura moderna para React Native baseada em **Feature-Sliced Design (FSD)**, adaptada para o ecossistema Expo/React Native.

## Princípios Arquiteturais

### 1. Separação por Domínio (FSD)

Cada funcionalidade é organizada em **módulos** independentes dentro de `src/modules/`. Cada módulo contém:

-   **types/**: Definições TypeScript específicas do domínio
-   **hooks/**: Lógica de negócio e integração com TanStack Query
-   **components/**: Componentes UI específicos do módulo (opcional)

### 2. Camadas de Abstração

```
┌─────────────────────────────────────┐
│         app/ (Expo Router)          │  ← Rotas e navegação
├─────────────────────────────────────┤
│      src/modules/ (Features)        │  ← Lógica de domínio
├─────────────────────────────────────┤
│      src/shared/ (Compartilhado)    │  ← Componentes e utils genéricos
├─────────────────────────────────────┤
│      src/core/ (Infraestrutura)     │  ← Configurações globais
├─────────────────────────────────────┤
│      src/api/ (Comunicação)         │  ← Cliente HTTP (Axios)
└─────────────────────────────────────┘
```

### 3. Gerenciamento de Estado

-   **TanStack Query**: Estado do servidor (cache, sincronização, invalidação)
-   **React State**: Apenas estado local de UI
-   **AsyncStorage**: Persistência local (tokens, preferências)

## Fluxo de Dados

### Requisições de Dados

```
Componente → Hook Customizado → TanStack Query → Axios → API
                ↓
         Cache & Invalidação
```

### Exemplo Prático

```typescript
// 1. Componente usa hook
const { todos, isLoading } = useTodos();

// 2. Hook encapsula TanStack Query
export function useTodos() {
	return useQuery({
		queryKey: ["todos"],
		queryFn: async () => {
			const response = await axiosInstance.get("/todos");
			return response.data;
		},
	});
}

// 3. Axios faz requisição (com interceptors)
// 4. TanStack Query gerencia cache e refetch
```

## Padrões de Código

### Hooks Customizados

Sempre encapsule `useQuery` e `useMutation` em hooks customizados:

```typescript
// ✅ Bom
export function useTodos() {
  return useQuery({ ... });
}

// ❌ Evitar
// Usar useQuery diretamente no componente
```

### Tipos TypeScript

-   Defina tipos de domínio em `modules/[nome]/types/`
-   Tipos globais em `shared/types/`
-   Sempre tipar props, estados e respostas de API

### Componentes

-   Componentes específicos do módulo: `modules/[nome]/components/`
-   Componentes genéricos: `shared/components/`
-   Sempre usar TypeScript para props

## Configurações Importantes

### TanStack Query Managers

O projeto configura automaticamente:

1. **onlineManager**: Detecta conectividade via NetInfo
2. **focusManager**: Gerencia foco do app para refetch

### Path Aliases

-   `@/` → `src/`
-   `~/` → raiz do projeto

Configure no `tsconfig.json` e `babel.config.js`.

## Testes

### Estrutura

-   Testes de hooks: `modules/[nome]/hooks/__tests__/`
-   Mocks: `src/tests/mocks/`
-   Utilitários: `src/tests/utils/`

### Padrão de Teste

```typescript
describe("useTodos", () => {
	it("should fetch todos", async () => {
		// Mock axios
		// Render hook
		// Assert
	});
});
```

## Boas Práticas

1. **Nunca** use `useQuery` diretamente em componentes
2. **Sempre** crie hooks customizados para lógica de dados
3. **Sempre** defina tipos TypeScript
4. **Sempre** use path aliases (`@/`) para importações
5. **Sempre** invalide queries após mutations
6. **Considere** atualizações otimistas para melhor UX

## Próximos Passos

-   Adicionar tratamento de erros global
-   Implementar autenticação completa
-   Adicionar testes de componentes
-   Configurar CI/CD
-   Adicionar documentação de API
