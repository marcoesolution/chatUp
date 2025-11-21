# ChatUp - Arquitetura Moderna React Native

Projeto React Native com Expo utilizando uma arquitetura moderna baseada em **Feature-Sliced Design (FSD)**, TypeScript, TanStack Query e Expo Router.

## 🏗️ Arquitetura

Este projeto segue os princípios do **Feature-Sliced Design (FSD)** adaptado para React Native, garantindo:

- **Modularidade**: Separação clara de responsabilidades por domínio
- **Manutenibilidade**: Código organizado e fácil de manter
- **Escalabilidade**: Estrutura preparada para crescimento
- **Type Safety**: TypeScript em toda a aplicação
- **Performance**: Otimizações com TanStack Query

## 📁 Estrutura de Pastas

```
MyProject/
├── app/                  # Expo Router (file-based routing)
│   ├── (tabs)/           # Navegação por abas
│   ├── _layout.tsx       # Layout raiz com providers
│   └── index.tsx         # Tela inicial
├── src/
│   ├── api/              # Configuração Axios
│   ├── assets/           # Imagens, fontes, ícones
│   ├── core/             # Infraestrutura global
│   │   ├── queryClient.ts    # Configuração TanStack Query
│   │   └── hooks/            # Hooks globais
│   ├── modules/          # Módulos de domínio (Features)
│   │   ├── auth/         # Autenticação
│   │   ├── profile/      # Perfil do usuário
│   │   └── todos/        # Gerenciamento de tarefas
│   ├── shared/           # Componentes e utilitários compartilhados
│   │   ├── components/   # UI genérica (Button, Card, etc.)
│   │   ├── hooks/        # Hooks reutilizáveis
│   │   ├── types/        # Tipos globais
│   │   └── utils/        # Funções utilitárias
│   ├── services/         # Serviços (AsyncStorage, etc.)
│   └── tests/            # Configuração e mocks de testes
├── tsconfig.json         # Configuração TypeScript
├── jest.config.js        # Configuração Jest
└── package.json
```

## 🚀 Tecnologias

- **React Native** 0.81.5
- **Expo** ~54.0.25
- **Expo Router** ~4.0.0 (File-based routing)
- **TypeScript** ~5.9.2
- **TanStack Query** ^5.62.0 (Gerenciamento de estado do servidor)
- **Axios** ^1.7.9 (Requisições HTTP)
- **Jest** ^29.7.0 (Testes)

## 📦 Instalação

1. Instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure a URL da API:

```
EXPO_PUBLIC_API_URL=https://api.example.com
```

3. Inicie o projeto:

```bash
npm start
```

## 🧪 Testes

Execute os testes:

```bash
# Todos os testes
npm test

# Modo watch
npm run test:watch

# Com coverage
npm run test:coverage
```

## 📝 Padrões de Código

### Módulos (Features)

Cada módulo segue a estrutura:

```
modules/[nome]/
├── components/    # Componentes específicos do módulo
├── hooks/         # Hooks customizados (useQuery, useMutation)
└── types/         # Tipos TypeScript do domínio
```

### Hooks com TanStack Query

```typescript
// Exemplo: useTodos
export function useTodos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await axiosInstance.get('/todos');
      return response.data;
    },
  });

  // Mutations...
}
```

### Componentes Compartilhados

Componentes genéricos ficam em `shared/components/` e são exportados através de um `index.ts`.

### Path Aliases

Use os aliases configurados:

- `@/` → `src/`
- `~/` → raiz do projeto

Exemplo:

```typescript
import { Button } from '@/shared/components';
import { useTodos } from '@/modules/todos';
```

## 🔧 Configurações Importantes

### TanStack Query

O `queryClient` está configurado com:

- **onlineManager**: Detecta mudanças de conectividade
- **focusManager**: Gerencia foco do app para refetch automático
- **Query Function padrão**: Usa Axios automaticamente

### Expo Router

- Rotas baseadas em arquivos em `app/`
- Type-safe navigation
- Deep linking automático

### TypeScript

- Strict mode habilitado
- Path aliases configurados
- Tipos para todas as APIs

## 📚 Documentação Adicional

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Feature-Sliced Design](https://feature-sliced.design/)

## 🤝 Contribuindo

1. Siga a estrutura de pastas estabelecida
2. Mantenha a tipagem TypeScript rigorosa
3. Escreva testes para hooks e componentes críticos
4. Use os hooks customizados do TanStack Query
5. Documente componentes e funções complexas

## 📄 Licença

Este projeto é privado.

