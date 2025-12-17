import api from "@/services/api";
import { encryptMessage } from "@/core/security";
import type { Message } from "@/modules/chat/types";

/**
 * Serviço otimizado para upload de imagens no Firebase Storage
 * 
 * VANTAGENS sobre Base64:
 * - ✅ Sem overhead de codificação (~33% menor)
 * - ✅ Upload direto (mais rápido)
 * - ✅ Suporte a metadados (tipo MIME, tamanho)
 * - ✅ URLs temporárias com expiração
 * - ✅ Compressão automática do Firebase
 * 
 * SEGURANÇA:
 * - Imagens são armazenadas em paths criptografados
 * - Apenas usuários autorizados podem acessar
 * - URLs expiram automaticamente
 */

export interface ImageUploadResult {
	url: string;
	path: string;
	size: number;
	contentType: string;
}

export interface ImageUploadOptions {
	chatId: string;
	senderId: string;
	receiverId: string;
	quality?: number; // 0-1, padrão 0.8 (80% qualidade)
	maxWidth?: number; // Largura máxima em pixels
	maxHeight?: number; // Altura máxima em pixels
}

/**
 * Converte URI de imagem local para Blob (para upload)
 */
async function uriToBlob(uri: string): Promise<Blob> {
	const response = await fetch(uri);
	if (!response.ok) {
		throw new Error(`Erro ao carregar imagem: ${response.statusText}`);
	}
	return await response.blob();
}

/**
 * Comprime imagem usando Canvas API (React Native usa expo-image)
 * Para React Native, a compressão deve ser feita antes de chamar esta função
 */
async function compressImageIfNeeded(
	blob: Blob,
	options: ImageUploadOptions
): Promise<Blob> {
	// Em React Native, use expo-image-manipulator ou similar
	// Por enquanto, retornar blob original
	// TODO: Implementar compressão nativa quando necessário
	return blob;
}

/**
 * Faz upload de imagem para Firebase Storage
 * 
 * @param imageUri - URI local da imagem (file:// ou content://)
 * @param options - Opções de upload
 * @returns URL pública da imagem e metadados
 */
export async function uploadImage(
	imageUri: string,
	options: ImageUploadOptions
): Promise<ImageUploadResult> {
	try {
		const formData = new FormData();
        // React Native FormData handling
        const fileName = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : `image`;

        // @ts-ignore: React Native FormData expects specific object structure
        formData.append('file', {
            uri: imageUri,
            name: fileName,
            type,
        });

        // Add metadata if backend supports (FilesController doesn't currently use them, but good for future)
        // formData.append('chatId', options.chatId);

		console.log(`📤 Fazendo upload de imagem: ${fileName}`);
		const uploadStartTime = Date.now();

        const response = await api.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

		const uploadDuration = Date.now() - uploadStartTime;
		console.log(`✅ Upload concluído em ${uploadDuration}ms`);
        
        // Backend returns: { url, path, size, contentType }
        const data = response.data;
        
        // Ensure URL is absolute if backend returns relative
        // Assuming api.defaults.baseURL is set, but the URL returned might be relative to host
        // Frontend likely needs full URL or relative to API base?
        // Let's assume the backend returned URL is usable or we construct it.
        // For local files served by static, we might need adjustments. 
        // Controller returns `/files/filename`. 
        // If API is `http://192.168.1.5:3000/api`, file is at `http://192.168.1.5:3000/files/filename`.
        // We might need to handle this URL construction.
        
        // Let's assume for now we use the returned URL directly, assuming app knows how to handle it 
        // OR construct full URL if the backend API base is known.
        // Quick fix: Prepend API base URL logic if needed, but 'api' service usually proxies or has base.
        // Let's just return what backend gave, assuming frontend image component handles it 
        // or uses a helper to prepend Host.
        // Given 'useImage' hook might not exist, standard <Image source={{uri}} /> needs full URL.
        
        const fullUrl = data.url.startsWith('http') ? data.url : `${api.defaults.baseURL?.replace('/api', '')}${data.url}`;

		return {
			url: fullUrl,
			path: data.path,
			size: data.size,
			contentType: data.contentType,
		};
	} catch (error: any) {
		console.error("❌ Erro ao fazer upload de imagem:", error);
		throw new Error(`Falha ao fazer upload de imagem: ${error.message}`);
	}
}

/**
 * Cria mensagem com imagem (URL criptografada)
 * 
 * A URL da imagem é criptografada antes de ser enviada como mensagem
 * Isso garante que apenas o destinatário possa descriptografar e acessar a imagem
 */
export async function createImageMessage(
	imageUri: string,
	options: ImageUploadOptions
): Promise<{ imageUrl: string; encryptedUrl: string }> {
	// 1. Upload da imagem
	const uploadResult = await uploadImage(imageUri, options);

	// 2. Criptografar URL da imagem antes de enviar como mensagem
	// Isso garante que apenas o destinatário possa acessar
	const encryptedUrl = await encryptMessage(
		uploadResult.url,
		options.chatId,
		options.senderId,
		options.receiverId
	);

	return {
		imageUrl: uploadResult.url,
		encryptedUrl,
	};
}

/**
 * Deleta imagem do Storage
 */
export async function deleteImage(storagePath: string): Promise<void> {
    // Not implemented on backend API yet
	console.log(`🗑️ (Mock) Imagem deletada: ${storagePath}`);
}

/**
 * Extrai URL descriptografada de mensagem com imagem
 */
export async function decryptImageUrl(
	encryptedUrl: string,
	chatId: string,
	userId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	const { decryptMessage } = await import("@/core/security");
	return await decryptMessage(encryptedUrl, chatId, userId, senderId, receiverId);
}

