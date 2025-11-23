# Como Usar o Emulador com Dispositivo Físico Conectado

## Problema

Quando você tem **dois dispositivos conectados** (emulador + dispositivo físico), o Expo pode escolher o dispositivo físico por padrão ao pressionar `a` no terminal.

## Solução: Forçar Uso do Emulador

### Método 1: Script Automatizado (Recomendado)

```bash
npm run start:emulator
```

Este comando:
- ✅ Detecta automaticamente o emulador (emulator-5554)
- ✅ Configura `ANDROID_SERIAL` para forçar o emulador
- ✅ Inicia Metro e conecta ao emulador
- ✅ Ignora o dispositivo físico

### Método 2: Variável de Ambiente

```bash
ANDROID_SERIAL=emulator-5554 npm start
```

Depois, quando o Metro iniciar, pressione `a` e ele conectará ao emulador.

### Método 3: Desconectar Dispositivo Físico

```bash
# Desconectar dispositivo físico temporariamente
adb -s RXCTA06V4GB disconnect

# Iniciar Metro normalmente
npm start

# Reconectar depois (opcional)
adb -s RXCTA06V4GB connect
```

---

## Comandos Disponíveis

### Iniciar Metro para Emulador:
```bash
npm run start:emulator
```

### Iniciar Metro com Cache Limpo:
```bash
npm run start:emulator:clear
```

### Conectar App ao Emulador:
```bash
npm run connect:emulator
```

### Iniciar e Conectar Automaticamente:
```bash
npm run start:emulator
# Depois, no emulador, abra Expo Go e escaneie o QR code
```

---

## Fluxo Completo de Debug

### 1. Iniciar Metro para Emulador:
```bash
npm run start:emulator
```

### 2. No Emulador:
- Abra o Expo Go
- Escaneie o QR code que aparece no terminal
- Ou pressione `a` no terminal (agora vai conectar ao emulador)

### 3. Ativar Debug:
- No emulador: **Ctrl+M** (ou Menu > Shake)
- Selecione **"Debug"**
- Acesse no navegador: `http://localhost:8081/debugger-ui/`

### 4. Ver Logs:
- Console do navegador mostrará logs do React Native
- Terminal do Metro mostrará logs do bundler

---

## Verificar Qual Dispositivo Está Conectado

```bash
# Ver todos os dispositivos
adb devices

# Ver apenas emulador
adb devices | grep emulator

# Ver apenas dispositivo físico
adb devices | grep -v emulator
```

---

## Troubleshooting

### "Ainda conecta no dispositivo físico"
1. Verifique se o script está usando `ANDROID_SERIAL`:
   ```bash
   echo $ANDROID_SERIAL
   # Deve mostrar: emulator-5554
   ```

2. Use o script dedicado:
   ```bash
   npm run start:emulator
   ```

3. Desconecte o dispositivo físico temporariamente:
   ```bash
   adb -s RXCTA06V4GB disconnect
   ```

### "Emulador não aparece"
1. Verifique se está rodando:
   ```bash
   adb devices
   ```

2. Reinicie o emulador

3. Verifique se o ADB está funcionando:
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### "Metro não conecta"
1. Verifique se Metro está rodando:
   ```bash
   lsof -i :8081
   ```

2. Limpe cache e reinicie:
   ```bash
   npm run start:emulator:clear
   ```

---

## Dica Pro 💡

Crie um alias no seu `~/.bashrc` ou `~/.zshrc`:

```bash
alias expo-emulator='ANDROID_SERIAL=emulator-5554 expo start --android'
```

Depois, use:
```bash
expo-emulator
```

