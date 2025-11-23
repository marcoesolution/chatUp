# Como Capturar Logs do Crash no Dispositivo Físico

## Dispositivo: RXCTA06V4GB

## Método 1: Captura Rápida (Recomendado)

### Passo 1: Limpar logs antigos
```bash
adb -s RXCTA06V4GB logcat -c
```

### Passo 2: Iniciar captura em tempo real
```bash
adb -s RXCTA06V4GB logcat *:E AndroidRuntime:E ReactNativeJS:E | grep -i "chatup\|firebase\|error\|exception\|fatal\|crash"
```

### Passo 3: Reproduzir o crash
- Abra o app no dispositivo
- Vá até a tela de lista de contatos
- Aguarde o crash acontecer

### Passo 4: Parar a captura
- Pressione `Ctrl+C` no terminal

---

## Método 2: Salvar em Arquivo

### Capturar e salvar em arquivo:
```bash
# Limpar logs
adb -s RXCTA06V4GB logcat -c

# Capturar e salvar
adb -s RXCTA06V4GB logcat *:E AndroidRuntime:E ReactNativeJS:E > crash-$(date +%Y%m%d-%H%M%S).log
```

Depois de reproduzir o crash, pressione `Ctrl+C` e o arquivo será salvo.

---

## Método 3: Usar Script Automatizado

### Script completo (já criado):
```bash
./scripts/capture-crash-logs.sh
```

Este script:
- Limpa logs antigos automaticamente
- Filtra apenas erros relevantes
- Salva em arquivo com timestamp
- Mostra logs em tempo real

---

## Método 4: Captura Completa (Todos os Logs)

Se os métodos acima não mostrarem o erro:

```bash
# Limpar
adb -s RXCTA06V4GB logcat -c

# Capturar TUDO
adb -s RXCTA06V4GB logcat > full-logs-$(date +%Y%m%d-%H%M%S).log
```

**Atenção**: Este arquivo será muito grande. Use apenas se necessário.

---

## Filtros Úteis

### Apenas erros do app:
```bash
adb -s RXCTA06V4GB logcat | grep -i "chatup"
```

### Erros do React Native:
```bash
adb -s RXCTA06V4GB logcat | grep -i "reactnative"
```

### Erros do Firebase:
```bash
adb -s RXCTA06V4GB logcat | grep -i "firebase"
```

### Stack traces completos:
```bash
adb -s RXCTA06V4GB logcat *:E AndroidRuntime:E | grep -A 20 "FATAL EXCEPTION"
```

---

## O Que Procurar nos Logs

1. **FATAL EXCEPTION**: Indica crash fatal
2. **AndroidRuntime**: Erros do runtime do Android
3. **ReactNativeJS**: Erros do JavaScript/React Native
4. **Firebase**: Erros relacionados ao Firebase
5. **ProGuard/R8**: Erros de ofuscação (classes não encontradas)
6. **ClassNotFoundException**: Classe removida pelo ProGuard
7. **NoSuchMethodError**: Método removido pelo ProGuard

---

## Exemplo de Comando Completo

```bash
# 1. Limpar logs
adb -s RXCTA06V4GB logcat -c

# 2. Capturar apenas erros críticos
adb -s RXCTA06V4GB logcat \
  *:E \
  AndroidRuntime:E \
  ReactNativeJS:E \
  | grep -i -E "chatup|firebase|error|exception|fatal|crash|reactnative" \
  | tee crash-logs-$(date +%Y%m%d-%H%M%S).log
```

---

## Correções Aplicadas

1. ✅ **Proteção contra null/undefined** em `ContactListItem` (contact.name)
2. ✅ **ProGuard rules** atualizadas para manter classes do Firebase
3. ✅ **ErrorBoundary** melhorado com mais informações

---

## Próximos Passos Após Capturar Logs

1. Compartilhe o arquivo de log ou cole o conteúdo relevante
2. Procure por "FATAL EXCEPTION" ou "AndroidRuntime"
3. Verifique se há erros relacionados ao ProGuard
4. Verifique se há erros do Firebase ou React Native

