# Como Instalar APK no Emulador e Ativar Debug no Navegador

## Passo 1: Instalar APK no Emulador

### Opção A: Script Automatizado (Recomendado)
```bash
npm run install:android:emulator
```

### Opção B: Comando Direto
```bash
# Instalar no emulador (detecta automaticamente)
./scripts/install-apk-emulator.sh

# Ou especificar emulador
./scripts/install-apk-emulator.sh ./build-123.apk emulator-5554
```

### Opção C: ADB Direto
```bash
# Encontrar ID do emulador
adb devices

# Instalar APK
adb -s emulator-5554 install -r ./build-1763869690965.apk
```

---

## Passo 2: Ativar Debug no Navegador

### Método 1: Menu de Desenvolvedor (Recomendado)

1. **Abrir menu de desenvolvedor no emulador:**
   ```bash
   # Pressionar Ctrl+M no emulador
   # Ou via ADB:
   adb -s emulator-5554 shell input keyevent 82
   ```

2. **No menu que aparecer, selecione:**
   - "Debug" ou "Open Debugger"
   - Isso abrirá automaticamente no navegador: `http://localhost:8081/debugger-ui/`

### Método 2: Via Metro Bundler

1. **Iniciar Metro Bundler:**
   ```bash
   npm start
   # ou
   npm run debug:metro
   ```

2. **No emulador, agite o dispositivo (Ctrl+M) e selecione "Debug"**

3. **Acesse no navegador:**
   - `http://localhost:8081/debugger-ui/`
   - Ou use Chrome DevTools: `chrome://inspect`

### Método 3: React Native Debugger (Avançado)

1. **Instalar React Native Debugger (opcional):**
   ```bash
   # macOS
   brew install --cask react-native-debugger
   
   # Linux/Windows - baixar de:
   # https://github.com/jhen0409/react-native-debugger/releases
   ```

2. **Abrir debugger:**
   ```bash
   npm run debug
   ```

3. **No emulador, agite (Ctrl+M) e selecione "Debug"**

---

## Passo 3: Verificar se Debug Está Ativo

### No Navegador:
- Abra: `http://localhost:8081/debugger-ui/`
- Deve mostrar: "Debugger session active"
- Console do navegador mostrará logs do React Native

### No Emulador:
- Menu de desenvolvedor mostrará "Debugger connected"
- Logs aparecerão no console do navegador

---

## Comandos Úteis

### Verificar dispositivos:
```bash
adb devices
```

### Abrir menu de desenvolvedor via ADB:
```bash
# Emulador
adb -s emulator-5554 shell input keyevent 82

# Dispositivo físico
adb -s RXCTA06V4GB shell input keyevent 82
```

### Ver logs do Metro:
```bash
npm start
```

### Limpar cache e reiniciar:
```bash
npm run start:clear
```

### Ver logs do app no terminal:
```bash
adb -s emulator-5554 logcat | grep -i "ReactNativeJS"
```

---

## Troubleshooting

### "Debugger não conecta"
1. Verifique se Metro está rodando: `npm start`
2. Verifique se porta 8081 está livre: `lsof -i :8081`
3. Tente reiniciar Metro: `npm run start:clear`

### "Menu de desenvolvedor não aparece"
1. Verifique se o app está em modo debug (não release)
2. Tente: `adb -s emulator-5554 shell input keyevent 82`
3. Verifique se depuração USB está habilitada

### "Erro de conexão"
1. Verifique firewall
2. Tente usar tunnel: `npm run start:tunnel`
3. Verifique se Metro está acessível: `curl http://localhost:8081`

---

## Fluxo Completo

```bash
# 1. Instalar APK no emulador
npm run install:android:emulator

# 2. Iniciar Metro Bundler
npm start

# 3. No emulador, abrir menu (Ctrl+M) e selecionar "Debug"

# 4. Acessar no navegador
# http://localhost:8081/debugger-ui/
```

---

## Nota Importante

⚠️ **APKs de produção (release builds) geralmente não suportam debug remoto.**

Para debug no navegador, use:
- Build de preview: `npm run build:android:apk:preview`
- Ou desenvolvimento: `npm run build:android:dev`

