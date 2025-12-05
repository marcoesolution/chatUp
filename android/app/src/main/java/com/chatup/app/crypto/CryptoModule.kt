package com.chatup.app.crypto

import android.util.Base64
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Módulo Nativo de Criptografia para React Native
 * 
 * Implementa operações criptográficas em código nativo (Kotlin) para:
 * - Performance 10-100x melhor que JavaScript
 * - Execução em threads nativas (não trava UI)
 * - Uso de APIs criptográficas nativas do Android
 * - Menor consumo de bateria e memória
 * 
 * Todas as operações são assíncronas e executadas em background threads.
 */
class CryptoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // Scope para coroutines (cancelado quando módulo é destruído)
    private val moduleScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun getName() = "NativeCrypto"

    /**
     * Limpa recursos quando módulo é destruído
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        moduleScope.cancel()
    }

    // ============================================
    // PBKDF2 - Password-Based Key Derivation
    // ============================================

    /**
     * Deriva uma chave usando PBKDF2-HMAC-SHA256
     * 
     * Performance: ~10-50x mais rápido que JavaScript
     * - 50k iterações: ~500ms-2s (vs ~5-10s em JS)
     * - 100k iterações: ~1-4s (vs ~60-100s em JS)
     * 
     * @param password Senha/passphrase
     * @param salt Salt em Base64
     * @param iterations Número de iterações (recomendado: 50000+)
     * @param keyLength Tamanho da chave em bytes (padrão: 32 = 256 bits)
     * @param promise Promise para retornar resultado
     */
    @ReactMethod
    fun pbkdf2(
        password: String,
        salt: String,
        iterations: Int,
        keyLength: Int,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val startTime = System.currentTimeMillis()

                // Decodificar salt de Base64
                val saltBytes = Base64.decode(salt, Base64.NO_WRAP)

                // Configurar PBKDF2
                val spec = PBEKeySpec(
                    password.toCharArray(),
                    saltBytes,
                    iterations,
                    keyLength * 8 // bits
                )

                // Gerar chave usando PBKDF2-HMAC-SHA256
                val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                val key = factory.generateSecret(spec)
                val keyBytes = key.encoded

                // Codificar resultado em Base64
                val keyBase64 = Base64.encodeToString(keyBytes, Base64.NO_WRAP)

                val duration = System.currentTimeMillis() - startTime
                android.util.Log.d("NativeCrypto", "✅ PBKDF2 concluído em ${duration}ms (${iterations} iterações)")

                // Retornar resultado
                promise.resolve(keyBase64)

            } catch (e: Exception) {
                android.util.Log.e("NativeCrypto", "❌ Erro em PBKDF2", e)
                promise.reject("PBKDF2_ERROR", "Erro ao derivar chave: ${e.message}", e)
            }
        }
    }

    // ============================================
    // AES-256-CBC - Criptografia Simétrica
    // ============================================

    /**
     * Criptografa dados usando AES-256-CBC + HMAC-SHA256
     * 
     * @param plaintext Texto plano
     * @param key Chave em Base64 (256 bits)
     * @param iv IV em Base64 (128 bits)
     * @param promise Promise para retornar resultado
     */
    @ReactMethod
    fun encryptAES(
        plaintext: String,
        key: String,
        iv: String,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val startTime = System.currentTimeMillis()

                // Decodificar chave e IV
                val keyBytes = Base64.decode(key, Base64.NO_WRAP)
                val ivBytes = Base64.decode(iv, Base64.NO_WRAP)

                // Validar tamanhos
                if (keyBytes.size != 32) {
                    throw IllegalArgumentException("Chave deve ter 256 bits (32 bytes)")
                }
                if (ivBytes.size != 16) {
                    throw IllegalArgumentException("IV deve ter 128 bits (16 bytes)")
                }

                // Configurar cipher AES-256-CBC
                val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
                val secretKey = SecretKeySpec(keyBytes, "AES")
                val ivSpec = IvParameterSpec(ivBytes)
                cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec)

                // Criptografar
                val plaintextBytes = plaintext.toByteArray(Charsets.UTF_8)
                val ciphertextBytes = cipher.doFinal(plaintextBytes)

                // Gerar tag HMAC para autenticação
                val mac = Mac.getInstance("HmacSHA256")
                mac.init(SecretKeySpec(keyBytes, "HmacSHA256"))
                val tagBytes = mac.doFinal(ciphertextBytes)

                // Codificar em Base64
                val ciphertextBase64 = Base64.encodeToString(ciphertextBytes, Base64.NO_WRAP)
                val tagBase64 = Base64.encodeToString(tagBytes, Base64.NO_WRAP)

                val duration = System.currentTimeMillis() - startTime
                android.util.Log.d("NativeCrypto", "✅ AES encrypt concluído em ${duration}ms")

                // Retornar resultado
                val result = Arguments.createMap().apply {
                    putString("ciphertext", ciphertextBase64)
                    putString("tag", tagBase64)
                }
                promise.resolve(result)

            } catch (e: Exception) {
                android.util.Log.e("NativeCrypto", "❌ Erro em encryptAES", e)
                promise.reject("ENCRYPT_ERROR", "Erro ao criptografar: ${e.message}", e)
            }
        }
    }

    /**
     * Descriptografa dados usando AES-256-CBC + HMAC-SHA256
     * 
     * @param ciphertext Texto cifrado em Base64
     * @param key Chave em Base64 (256 bits)
     * @param iv IV em Base64 (128 bits)
     * @param tag Tag HMAC em Base64
     * @param promise Promise para retornar resultado
     */
    @ReactMethod
    fun decryptAES(
        ciphertext: String,
        key: String,
        iv: String,
        tag: String,
        promise: Promise
    ) {
        moduleScope.launch {
            try {
                val startTime = System.currentTimeMillis()

                // Decodificar
                val keyBytes = Base64.decode(key, Base64.NO_WRAP)
                val ivBytes = Base64.decode(iv, Base64.NO_WRAP)
                val ciphertextBytes = Base64.decode(ciphertext, Base64.NO_WRAP)
                val tagBytes = Base64.decode(tag, Base64.NO_WRAP)

                // Verificar tag HMAC primeiro (autenticação)
                val mac = Mac.getInstance("HmacSHA256")
                mac.init(SecretKeySpec(keyBytes, "HmacSHA256"))
                val computedTagBytes = mac.doFinal(ciphertextBytes)

                // Comparação constant-time para evitar timing attacks
                if (!constantTimeEquals(tagBytes, computedTagBytes)) {
                    throw SecurityException("Autenticação falhou: tag inválida - mensagem pode ter sido alterada")
                }

                // Descriptografar
                val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
                val secretKey = SecretKeySpec(keyBytes, "AES")
                val ivSpec = IvParameterSpec(ivBytes)
                cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec)

                val plaintextBytes = cipher.doFinal(ciphertextBytes)
                val plaintext = String(plaintextBytes, Charsets.UTF_8)

                val duration = System.currentTimeMillis() - startTime
                android.util.Log.d("NativeCrypto", "✅ AES decrypt concluído em ${duration}ms")

                promise.resolve(plaintext)

            } catch (e: SecurityException) {
                android.util.Log.e("NativeCrypto", "❌ Falha de autenticação", e)
                promise.reject("AUTH_ERROR", e.message, e)
            } catch (e: Exception) {
                android.util.Log.e("NativeCrypto", "❌ Erro em decryptAES", e)
                promise.reject("DECRYPT_ERROR", "Erro ao descriptografar: ${e.message}", e)
            }
        }
    }

    // ============================================
    // Utilitários
    // ============================================

    /**
     * Gera bytes aleatórios criptograficamente seguros
     * 
     * @param length Número de bytes
     * @param promise Promise para retornar resultado em Base64
     */
    @ReactMethod
    fun getRandomBytes(length: Int, promise: Promise) {
        moduleScope.launch {
            try {
                val bytes = ByteArray(length)
                SecureRandom().nextBytes(bytes)
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                promise.resolve(base64)
            } catch (e: Exception) {
                promise.reject("RANDOM_ERROR", "Erro ao gerar bytes aleatórios: ${e.message}", e)
            }
        }
    }

    /**
     * Gera hash SHA-256
     * 
     * @param data Dados em string
     * @param promise Promise para retornar hash em hexadecimal
     */
    @ReactMethod
    fun sha256(data: String, promise: Promise) {
        moduleScope.launch {
            try {
                val digest = java.security.MessageDigest.getInstance("SHA-256")
                val hashBytes = digest.digest(data.toByteArray(Charsets.UTF_8))
                val hashHex = hashBytes.joinToString("") { "%02x".format(it) }
                promise.resolve(hashHex)
            } catch (e: Exception) {
                promise.reject("SHA256_ERROR", "Erro ao gerar hash: ${e.message}", e)
            }
        }
    }

    /**
     * Gera HMAC-SHA256
     * 
     * @param key Chave em Base64
     * @param data Dados em string
     * @param promise Promise para retornar HMAC em Base64
     */
    @ReactMethod
    fun hmacSHA256(key: String, data: String, promise: Promise) {
        moduleScope.launch {
            try {
                val keyBytes = Base64.decode(key, Base64.NO_WRAP)
                val mac = Mac.getInstance("HmacSHA256")
                mac.init(SecretKeySpec(keyBytes, "HmacSHA256"))
                val hmacBytes = mac.doFinal(data.toByteArray(Charsets.UTF_8))
                val hmacBase64 = Base64.encodeToString(hmacBytes, Base64.NO_WRAP)
                promise.resolve(hmacBase64)
            } catch (e: Exception) {
                promise.reject("HMAC_ERROR", "Erro ao gerar HMAC: ${e.message}", e)
            }
        }
    }

    // ============================================
    // Funções Auxiliares Privadas
    // ============================================

    /**
     * Comparação constant-time para evitar timing attacks
     */
    private fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
        if (a.size != b.size) return false
        
        var result = 0
        for (i in a.indices) {
            result = result or (a[i].toInt() xor b[i].toInt())
        }
        return result == 0
    }

    // ============================================
    // Constantes Exportadas para JavaScript
    // ============================================

    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "PBKDF2_MIN_ITERATIONS" to 10000,
            "PBKDF2_RECOMMENDED_ITERATIONS" to 50000,
            "AES_KEY_SIZE" to 32,
            "AES_IV_SIZE" to 16,
            "SALT_SIZE" to 32
        )
    }
}
