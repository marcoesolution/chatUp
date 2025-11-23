# Como Corrigir "Downloading..." no Emulador

## Problema

O app fica travado em "downloading..." no emulador e não carrega.

## Solução Rápida

Execute o script de correção:

```bash
npm run fix:downloading
```

Este script:
- ✅ Verifica se Metro está rodando
- ✅ Configura redirecionamento de porta (adb reverse)
- ✅ Limpa cache do Expo Go
- ✅ Testa conexão com Metro

---

## Soluções Manuais

### 1. Configurar Redirecionamento de Porta

O emulador precisa de redirecionamento de porta para acessar o Metro:

```bash
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

### 2. Limpar Cache do Expo Go

```bash
adb -s emulator-5554 shell pm clear host.exp.exponent
```

### 3. Reiniciar Metro com Cache Limpo

```bash
npm run start:emulator:clear
```

### 4. Usar Modo Tunnel (Se LAN não funcionar)

```bash
npm run start:tunnel
```

O modo tunnel cria uma conexão segura através dos servidores do Expo, útil quando há problemas de rede local.

### 5. Usar Modo LAN

```bash
npm run start:lan
```

---

## Passo a Passo Completo

### 1. Parar Metro (se estiver rodando)
- Pressione `Ctrl+C` no terminal do Metro

### 2. Configurar redirecionamento de porta
```bash
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

### 3. Limpar cache do Expo Go
```bash
adb -s emulator-5554 shell pm clear host.exp.exponent
```

### 4. Reiniciar Metro
```bash
npm run start:emulator
```

### 5. No emulador:
- Feche o Expo Go completamente (swipe para fechar)
- Abra o Expo Go novamente
- Escaneie o QR code do terminal

---

## Verificações

### Metro está rodando?
```bash
lsof -i :8081
```

### Emulador está conectado?
```bash
adb devices
```

### Porta está redirecionada?
```bash
adb -s emulator-5554 reverse --list
```

### Metro está acessível?
```bash
curl http://localhost:8081/status
```

---

## Soluções Alternativas

### Opção 1: Usar Tunnel (Recomendado se nada funcionar)
```bash
npm run start:tunnel
```

### Opção 2: Usar LAN
```bash
npm run start:lan
```

Depois, no emulador, use o IP da sua máquina ao invés de localhost.

### Opção 3: Instalar APK Diretamente
Se o problema persistir, instale o APK diretamente:

```bash
npm run build:android:apk:preview
npm run install:android:emulator
```

---

## Troubleshooting Avançado

### Ver logs do Expo Go
```bash
adb -s emulator-5554 logcat | grep -i expo
```

### Ver logs do Metro
No terminal onde o Metro está rodando, você verá os logs automaticamente.

### Verificar firewall
Certifique-se de que a porta 8081 não está bloqueada pelo firewall.

### Reiniciar ADB
```bash
adb kill-server
adb start-server
adb devices
```

---

## Dica Pro 💡

Se o problema persistir, use o modo tunnel que sempre funciona:

```bash
npm run start:tunnel
```

O modo tunnel é mais lento, mas é a solução mais confiável para problemas de rede.


