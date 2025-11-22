# 📱 Guia de Build e Instalação Android

## 🎯 Problema Resolvido

Quando você usa o Expo Go, as permissões são solicitadas para o **Expo Go**, não para o seu app **ChatUp**. Para testar as permissões corretamente, você precisa instalar o app standalone.

## 🚀 Scripts Disponíveis

### Build Local de APK

```bash
# Build rápido (com prompts interativos)
npm run build:android:dev

# Build direto (sem prompts)
npm run build:android:local
```

### Instalação no Dispositivo USB

```bash
# Instalar APK no dispositivo conectado via USB
npm run install:android

# Ou diretamente
./scripts/install-apk-usb.sh [caminho-do-apk]
```

### Build + Instalação Automática

```bash
# Faz build e instala automaticamente
npm run build:install:android
```

## 📋 Pré-requisitos

1. **EAS CLI instalado e logado:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Android SDK Platform Tools (adb):**
   - Linux: `sudo apt-get install android-tools-adb`
   - macOS: `brew install android-platform-tools`
   - Windows: Baixe do [Android Developer](https://developer.android.com/studio/releases/platform-tools)

3. **Dispositivo Android configurado:**
   - Habilitar "Depuração USB" nas opções de desenvolvedor
   - Conectar via USB
   - Autorizar o computador quando solicitado

## 🔍 Verificar Dispositivo Conectado

```bash
adb devices
```

Deve mostrar algo como:
```
List of devices attached
ABC123XYZ    device
```

## 📦 Onde o APK é Gerado?

O APK será gerado em um dos seguintes locais:
- `.expo/android-builds/`
- `android/app/build/outputs/apk/`

O script de instalação procura automaticamente.

## ⚠️ Importante

- O app standalone terá o package name: `com.chatup.app`
- As permissões serão solicitadas para o **ChatUp**, não para o Expo Go
- Você pode ter o Expo Go e o ChatUp instalados simultaneamente (são apps diferentes)

## 🐛 Troubleshooting

### "Nenhum dispositivo encontrado"
- Verifique se o USB está conectado
- Execute `adb devices` para ver se o dispositivo aparece
- Verifique se a depuração USB está habilitada

### "APK não encontrado"
- Execute primeiro: `npm run build:android:local`
- Ou forneça o caminho manualmente: `./scripts/install-apk-usb.sh /caminho/para/app.apk`

### "Falha ao instalar"
- Desinstale a versão anterior manualmente
- Verifique se há espaço suficiente no dispositivo
- Tente: `adb install -r /caminho/do/apk.apk`

