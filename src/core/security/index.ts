/**
 * Módulo de Segurança - Exportações principais
 */

export {
	encryptMessage,
	decryptMessage,
	generateMessageHMAC,
	verifyMessageHMAC,
	clearAllKeys,
	exportChatKey,
	importChatKey,
	preloadChatKey,
} from './crypto';

// E2EE com ECDH
export {
	encryptMessageE2EE,
	decryptMessageE2EE,
	getSharedSecret,
	clearSharedSecretCache,
} from './e2ee';

// Gerenciamento de chaves
export {
	generateKeyPair,
	getOrCreateKeyPair,
	getPublicKey,
	getPrivateKey,
	storePublicKey,
	storePrivateKey,
	hasPublicKey,
	removePrivateKey,
	clearPublicKeyCache,
} from './keyManagement';

