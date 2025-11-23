# Fix: Crash do FlashList v2 - Nova Arquitetura Requerida

## Problema Identificado

O app estava crashando na tela de lista de contatos com o erro:

```
Error: FlashList v2 is only supported on new architecture
```

**Causa**: FlashList v2.0.2 requer a nova arquitetura do React Native (`newArchEnabled: true`), mas o app está configurado com `newArchEnabled: false`.

## Solução Aplicada

Revertido para **FlatList** do React Native, que é compatível com a arquitetura antiga e já estava funcionando anteriormente.

### Arquivos Modificados

1. **app/(tabs)/index.tsx**
   - Removido: `import { FlashList } from "@shopify/flash-list"`
   - Adicionado: `FlatList` do `react-native`
   - Substituído `<FlashList>` por `<FlatList>`

2. **app/(tabs)/chat/[contactId].tsx**
   - Removido: `import { FlashList, FlashListRef } from "@shopify/flash-list"`
   - Adicionado: `FlatList` do `react-native`
   - Substituído `<FlashList>` por `<FlatList>`
   - Restauradas props de otimização: `inverted`, `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, `initialNumToRender`, `getItemLayout`

3. **app/(tabs)/index.tsx**
   - Adicionada proteção contra null/undefined em `ContactListItem` (contact.name)

## Por Que Não Habilitar Nova Arquitetura?

A nova arquitetura do React Native requer:
- Rebuild completo de todas as dependências nativas
- Possíveis incompatibilidades com algumas bibliotecas
- Mais tempo de desenvolvimento e testes
- Pode introduzir novos bugs

Para um app em produção, é mais seguro usar FlatList que já está testado e funcionando.

## Próximos Passos

1. **Rebuild do APK**:
   ```bash
   npm run build:android:apk
   ```

2. **Testar no dispositivo físico**

3. **Se quiser usar FlashList no futuro**:
   - Habilitar nova arquitetura: `"newArchEnabled": true` em `app.json`
   - Rebuild completo de todas as dependências
   - Testar extensivamente antes de produção

## Alternativas Futuras

Se precisar de melhor performance no futuro:

1. **Habilitar Nova Arquitetura** e usar FlashList v2
2. **Usar FlashList v1** (se compatível com arquitetura antiga)
3. **Otimizar FlatList** com as props já implementadas (já feito)

## Status

✅ **Correção aplicada** - FlatList restaurado com otimizações
✅ **Proteções adicionadas** - Null checks implementados
✅ **Pronto para rebuild** - Código compilando sem erros

