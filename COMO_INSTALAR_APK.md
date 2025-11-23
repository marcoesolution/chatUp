# Como Instalar APK no Dispositivo Físico via USB

## Dispositivo: RXCTA06V4GB

## Método 1: Script Automatizado (Recomendado)

### Instalar APK mais recente automaticamente:
```bash
npm run install:android:device
```

Este comando:
- Detecta automaticamente o dispositivo RXCTA06V4GB
- Encontra o APK mais recente
- Desinstala versão anterior (se houver)
- Instala o novo APK
- Abre o app automaticamente

### Com caminho específico do APK:
```bash
./scripts/install-apk-device.sh ./build-1234567890.apk RXCTA06V4GB
```

---

## Método 2: Comando ADB Direto

### 1. Encontrar o APK mais recente:
```bash
# Listar APKs disponíveis
find . -name "*.apk" -type f -not -path "*/node_modules/*" | xargs ls -t | head -1
```

### 2. Instalar no dispositivo específico:
```bash
# Substitua pelo caminho do seu APK
adb -s RXCTA06V4GB install -r ./build-1234567890.apk
```

### 3. Abrir o app:
```bash
adb -s RXCTA06V4GB shell monkey -p com.chatup.app -c android.intent.category.LAUNCHER 1
```

---

## Método 3: Build + Instalação Automática

### Fazer build e instalar automaticamente:
```bash
npm run build:install:device
```

Este comando:
1. Faz o build do APK de produção
2. Instala automaticamente no dispositivo RXCTA06V4GB
3. Abre o app

---

## Comandos Úteis

### Verificar dispositivos conectados:
```bash
adb devices
```

### Verificar se o app está instalado:
```bash
adb -s RXCTA06V4GB shell pm list packages | grep chatup
```

### Desinstalar app:
```bash
adb -s RXCTA06V4GB uninstall com.chatup.app
```

### Ver logs em tempo real:
```bash
adb -s RXCTA06V4GB logcat | grep -i chatup
```

### Limpar dados do app:
```bash
adb -s RXCTA06V4GB shell pm clear com.chatup.app
```

---

## Troubleshooting

### "Device not found"
- Verifique se o USB está conectado
- Verifique se a depuração USB está habilitada
- Execute `adb devices` para ver se o dispositivo aparece
- Autorize o computador no dispositivo quando solicitado

### "APK not found"
- Execute primeiro: `npm run build:android:apk`
- Ou forneça o caminho manualmente

### "Installation failed"
- Verifique se há espaço suficiente no dispositivo
- Desinstale a versão anterior: `adb -s RXCTA06V4GB uninstall com.chatup.app`
- Tente instalar novamente

---

## Onde o APK é Gerado?

Após o build, o APK será gerado em:
- Raiz do projeto: `./build-*.apk`
- `.expo/android-builds/`
- `android/app/build/outputs/apk/`

O script procura automaticamente o mais recente.

