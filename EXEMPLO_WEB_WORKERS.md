# Exemplo Completo: Web Workers para Criptografia

## Estrutura de Arquivos

```
projeto/
├── index.html
├── main.js
├── crypto-worker.js
└── crypto-js.min.js
```

## 1. HTML (index.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Workers - Criptografia</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        
        .container {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
        }
        
        textarea {
            width: 100%;
            height: 100px;
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        button {
            background: #007AFF;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
        }
        
        button:hover {
            background: #0056b3;
        }
        
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .loading {
            display: none;
            color: #007AFF;
            margin: 10px 0;
        }
        
        .loading.show {
            display: block;
        }
        
        .result {
            background: white;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            word-break: break-all;
        }
        
        .stats {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Web Workers - Criptografia</h1>
        <p>Este exemplo demonstra como usar Web Workers para criptografia sem travar a UI.</p>
        
        <div>
            <label for="message">Mensagem:</label>
            <textarea id="message" placeholder="Digite sua mensagem aqui...">Olá, mundo! Esta é uma mensagem secreta.</textarea>
        </div>
        
        <div>
            <label for="password">Senha:</label>
            <input type="password" id="password" value="minhaSenhaSecreta123" style="width: 100%; padding: 10px; margin: 10px 0;">
        </div>
        
        <div>
            <button id="encryptBtn">🔒 Criptografar (Com Worker)</button>
            <button id="encryptNoWorkerBtn">🔒 Criptografar (Sem Worker - Trava UI)</button>
            <button id="decryptBtn" disabled>🔓 Descriptografar</button>
        </div>
        
        <div class="loading" id="loading">
            ⏳ Processando... (UI continua responsiva!)
        </div>
        
        <div class="result" id="result"></div>
        
        <div class="stats" id="stats"></div>
        
        <!-- Teste de responsividade -->
        <div style="margin-top: 30px; padding: 15px; background: #e3f2fd; border-radius: 4px;">
            <h3>Teste de Responsividade</h3>
            <p>Clique no botão abaixo enquanto a criptografia está rodando:</p>
            <button id="testBtn" onclick="alert('UI está responsiva! ✅')">
                Testar Responsividade
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                ✅ Com Worker: Botão funciona durante criptografia<br>
                ❌ Sem Worker: Botão não responde (UI travada)
            </p>
        </div>
    </div>
    
    <script src="main.js"></script>
</body>
</html>
```

## 2. JavaScript Principal (main.js)

```javascript
// Criar worker de criptografia
const cryptoWorker = new Worker('crypto-worker.js');

// Estado da aplicação
let encryptedData = null;

// Elementos DOM
const messageInput = document.getElementById('message');
const passwordInput = document.getElementById('password');
const encryptBtn = document.getElementById('encryptBtn');
const encryptNoWorkerBtn = document.getElementById('encryptNoWorkerBtn');
const decryptBtn = document.getElementById('decryptBtn');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const stats = document.getElementById('stats');

// ============================================
// CRIPTOGRAFIA COM WORKER (NÃO TRAVA UI)
// ============================================
encryptBtn.addEventListener('click', async () => {
    const message = messageInput.value;
    const password = passwordInput.value;
    
    if (!message || !password) {
        alert('Preencha mensagem e senha!');
        return;
    }
    
    // Desabilitar botões
    encryptBtn.disabled = true;
    encryptNoWorkerBtn.disabled = true;
    loading.classList.add('show');
    
    const startTime = performance.now();
    
    // Enviar para worker
    cryptoWorker.postMessage({
        tipo: 'encrypt',
        message: message,
        password: password,
        iterations: 50000 // 50k iterações (demora ~5-10s)
    });
    
    // Aguardar resultado
    cryptoWorker.onmessage = (event) => {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        if (event.data.erro) {
            alert('Erro: ' + event.data.erro);
        } else {
            encryptedData = event.data;
            
            result.innerHTML = `
                <h3>✅ Criptografado com Sucesso!</h3>
                <p><strong>Ciphertext:</strong></p>
                <code>${encryptedData.ciphertext.substring(0, 100)}...</code>
                <p><strong>IV:</strong> ${encryptedData.iv}</p>
                <p><strong>Salt:</strong> ${encryptedData.salt}</p>
            `;
            
            stats.innerHTML = `
                ⏱️ Tempo: ${duration}s | 
                🔐 Iterações: 50.000 | 
                🧵 Thread: Worker (background) |
                ✅ UI: Responsiva durante todo o processo
            `;
            
            decryptBtn.disabled = false;
        }
        
        // Reabilitar botões
        encryptBtn.disabled = false;
        encryptNoWorkerBtn.disabled = false;
        loading.classList.remove('show');
    };
    
    cryptoWorker.onerror = (error) => {
        alert('Erro no worker: ' + error.message);
        encryptBtn.disabled = false;
        encryptNoWorkerBtn.disabled = false;
        loading.classList.remove('show');
    };
});

// ============================================
// CRIPTOGRAFIA SEM WORKER (TRAVA UI)
// ============================================
encryptNoWorkerBtn.addEventListener('click', async () => {
    const message = messageInput.value;
    const password = passwordInput.value;
    
    if (!message || !password) {
        alert('Preencha mensagem e senha!');
        return;
    }
    
    // Avisar usuário
    if (!confirm('⚠️ ATENÇÃO: Isso vai TRAVAR a UI por ~5-10 segundos!\n\nTente clicar no botão "Testar Responsividade" durante o processo.\n\nContinuar?')) {
        return;
    }
    
    encryptBtn.disabled = true;
    encryptNoWorkerBtn.disabled = true;
    loading.classList.add('show');
    loading.textContent = '⏳ Processando... (UI TRAVADA - botões não funcionam!)';
    
    const startTime = performance.now();
    
    // Pequeno delay para UI atualizar
    setTimeout(() => {
        // Executar na thread principal (TRAVA!)
        try {
            // Simular PBKDF2 pesado (50k iterações)
            const salt = generateRandomSalt();
            const key = pbkdf2Sync(password, salt, 50000, 32);
            const iv = generateRandomIV();
            
            // Criptografar (simulado)
            const ciphertext = btoa(message); // Simplificado
            
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            result.innerHTML = `
                <h3>✅ Criptografado (Sem Worker)</h3>
                <p><strong>Ciphertext:</strong></p>
                <code>${ciphertext}</code>
                <p style="color: red; font-weight: bold;">
                    ⚠️ UI ficou TRAVADA por ${duration}s!
                </p>
            `;
            
            stats.innerHTML = `
                ⏱️ Tempo: ${duration}s | 
                🔐 Iterações: 50.000 | 
                🧵 Thread: Main (UI thread) |
                ❌ UI: TRAVADA durante todo o processo
            `;
        } catch (error) {
            alert('Erro: ' + error.message);
        }
        
        encryptBtn.disabled = false;
        encryptNoWorkerBtn.disabled = false;
        loading.classList.remove('show');
        loading.textContent = '⏳ Processando... (UI continua responsiva!)';
    }, 100);
});

// ============================================
// DESCRIPTOGRAFIA
// ============================================
decryptBtn.addEventListener('click', () => {
    if (!encryptedData) {
        alert('Nada para descriptografar!');
        return;
    }
    
    const password = passwordInput.value;
    
    encryptBtn.disabled = true;
    decryptBtn.disabled = true;
    loading.classList.add('show');
    
    const startTime = performance.now();
    
    // Enviar para worker
    cryptoWorker.postMessage({
        tipo: 'decrypt',
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        password: password,
        iterations: 50000
    });
    
    cryptoWorker.onmessage = (event) => {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        if (event.data.erro) {
            alert('Erro ao descriptografar: ' + event.data.erro);
        } else {
            result.innerHTML = `
                <h3>🔓 Descriptografado com Sucesso!</h3>
                <p><strong>Mensagem Original:</strong></p>
                <p style="font-size: 18px; color: green;">${event.data.plaintext}</p>
            `;
            
            stats.innerHTML = `
                ⏱️ Tempo: ${duration}s | 
                🔐 Iterações: 50.000 | 
                🧵 Thread: Worker (background)
            `;
        }
        
        encryptBtn.disabled = false;
        decryptBtn.disabled = false;
        loading.classList.remove('show');
    };
});

// ============================================
// FUNÇÕES AUXILIARES (SEM WORKER - SÍNCRONAS)
// ============================================
function generateRandomSalt() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
}

function generateRandomIV() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
}

// PBKDF2 síncrono (TRAVA UI!)
function pbkdf2Sync(password, salt, iterations, keyLength) {
    // Implementação simplificada que TRAVA a UI
    let result = password + salt;
    
    // Simular iterações pesadas
    for (let i = 0; i < iterations; i++) {
        // Operação pesada
        result = btoa(result + i);
        
        // A cada 1000 iterações, fazer operação extra pesada
        if (i % 1000 === 0) {
            for (let j = 0; j < 100; j++) {
                result = btoa(result);
            }
        }
    }
    
    return result.substring(0, keyLength);
}

console.log('✅ App carregado! Worker criado:', cryptoWorker);
```

## 3. Worker de Criptografia (crypto-worker.js)

```javascript
// Importar CryptoJS (se estiver usando)
// importScripts('crypto-js.min.js');

console.log('🧵 Worker de criptografia iniciado!');

// Escutar mensagens da thread principal
self.onmessage = async (event) => {
    const { tipo, message, password, ciphertext, iv, salt, iterations } = event.data;
    
    console.log('📨 Worker recebeu tarefa:', tipo);
    
    try {
        if (tipo === 'encrypt') {
            // CRIPTOGRAFAR
            const startTime = performance.now();
            
            // 1. Gerar salt aleatório
            const saltBytes = generateRandomBytes(32);
            const saltB64 = arrayBufferToBase64(saltBytes);
            
            console.log('🔐 Gerando chave com PBKDF2...');
            
            // 2. Derivar chave usando PBKDF2 (OPERAÇÃO PESADA!)
            const key = await pbkdf2(password, saltB64, iterations, 32);
            
            const pbkdf2Time = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ PBKDF2 concluído em ${pbkdf2Time}s`);
            
            // 3. Gerar IV aleatório
            const ivBytes = generateRandomBytes(16);
            const ivB64 = arrayBufferToBase64(ivBytes);
            
            // 4. Criptografar mensagem (simplificado para exemplo)
            // Em produção, usar CryptoJS ou Web Crypto API
            const encrypted = btoa(message + key); // Simplificado!
            
            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Criptografia concluída em ${totalTime}s`);
            
            // Enviar resultado de volta
            self.postMessage({
                ciphertext: encrypted,
                iv: ivB64,
                salt: saltB64,
                iterations: iterations
            });
            
        } else if (tipo === 'decrypt') {
            // DESCRIPTOGRAFAR
            const startTime = performance.now();
            
            console.log('🔓 Derivando chave para descriptografia...');
            
            // 1. Derivar chave usando mesmos parâmetros
            const key = await pbkdf2(password, salt, iterations, 32);
            
            const pbkdf2Time = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ PBKDF2 concluído em ${pbkdf2Time}s`);
            
            // 2. Descriptografar (simplificado)
            const decrypted = atob(ciphertext).replace(key, '');
            
            const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Descriptografia concluída em ${totalTime}s`);
            
            // Enviar resultado
            self.postMessage({
                plaintext: decrypted
            });
        }
    } catch (error) {
        console.error('❌ Erro no worker:', error);
        self.postMessage({
            erro: error.message
        });
    }
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Gera bytes aleatórios
 */
function generateRandomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array.buffer;
}

/**
 * Converte ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converte Base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * PBKDF2 - Password-Based Key Derivation Function 2
 * OPERAÇÃO PESADA que pode demorar 5-10 segundos!
 * Mas como está no Worker, não trava a UI! 🎉
 */
async function pbkdf2(password, salt, iterations, keyLength) {
    console.log(`🔐 Iniciando PBKDF2 com ${iterations} iterações...`);
    
    // Converter para ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);
    const saltBuffer = base64ToArrayBuffer(salt);
    
    // Importar chave
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );
    
    // Derivar chave (OPERAÇÃO PESADA!)
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        keyLength * 8 // bits
    );
    
    return arrayBufferToBase64(derivedBits);
}

console.log('✅ Worker pronto para receber tarefas!');
```

## 4. Como Usar

### Passo 1: Criar os Arquivos
Crie os 3 arquivos acima na mesma pasta.

### Passo 2: Servir com HTTP Server
Web Workers precisam de HTTP (não funciona com `file://`):

```bash
# Opção 1: Python
python3 -m http.server 8000

# Opção 2: Node.js
npx http-server -p 8000

# Opção 3: VS Code Live Server
# Instalar extensão "Live Server" e clicar com botão direito > "Open with Live Server"
```

### Passo 3: Abrir no Navegador
```
http://localhost:8000
```

### Passo 4: Testar

1. **Teste COM Worker:**
   - Clique em "Criptografar (Com Worker)"
   - Durante o processamento (~5-10s), clique em "Testar Responsividade"
   - ✅ Botão funciona! UI está responsiva!

2. **Teste SEM Worker:**
   - Clique em "Criptografar (Sem Worker - Trava UI)"
   - Durante o processamento, tente clicar em "Testar Responsividade"
   - ❌ Botão não responde! UI travada!

## 5. Comparação de Performance

| Aspecto | Com Worker | Sem Worker |
|---------|-----------|------------|
| **Tempo de processamento** | ~5-10s | ~5-10s |
| **UI responsiva?** | ✅ Sim | ❌ Não |
| **Botões funcionam?** | ✅ Sim | ❌ Não |
| **Animações continuam?** | ✅ Sim | ❌ Não |
| **Experiência do usuário** | ✅ Excelente | ❌ Péssima |

## 6. Conceitos Importantes

### Thread Principal vs Worker Thread

```
┌─────────────────────────────────────────┐
│         THREAD PRINCIPAL (UI)           │
│  - Renderização                         │
│  - Eventos (cliques, scroll)            │
│  - Animações                            │
│  - DOM manipulation                     │
│                                         │
│  ❌ Se fizer PBKDF2 aqui: TRAVA TUDO!  │
└─────────────────────────────────────────┘
              ↕️ postMessage
┌─────────────────────────────────────────┐
│         WORKER THREAD (Background)      │
│  - Cálculos pesados                     │
│  - Criptografia                         │
│  - Processamento de dados               │
│                                         │
│  ✅ PBKDF2 aqui: UI continua funcionando│
└─────────────────────────────────────────┘
```

### Comunicação entre Threads

```javascript
// Main Thread → Worker
worker.postMessage({ tipo: 'calcular', dados: [1,2,3] });

// Worker → Main Thread
self.postMessage({ resultado: 6 });
```

## 7. Limitações dos Web Workers

❌ **Não tem acesso a:**
- DOM (document, window)
- Variáveis globais da thread principal
- Funções da thread principal

✅ **Tem acesso a:**
- Web Crypto API
- Fetch API
- IndexedDB
- setTimeout/setInterval
- console.log

## Conclusão

Web Workers são **essenciais** para operações pesadas em aplicações web modernas. Eles permitem:

✅ UI sempre responsiva
✅ Melhor experiência do usuário
✅ Processamento paralelo
✅ Apps mais profissionais

**Mas em React Native:** Use módulos nativos ou bibliotecas especializadas!
