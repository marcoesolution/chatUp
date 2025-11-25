/**
 * Script para apagar todas as mensagens do Firestore
 * 
 * ATENÇÃO: Este script apaga TODAS as mensagens da collection 'messages'
 * Use apenas quando necessário (ex: migração de formato de criptografia)
 * 
 * Uso:
 *   npx ts-node scripts/clear-firestore-messages.ts
 * 
 * Ou com confirmação:
 *   npx ts-node scripts/clear-firestore-messages.ts --confirm
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, limit } from 'firebase/firestore';

// Configuração do Firebase (mesma do projeto)
const firebaseConfig = {
	apiKey: "AIzaSyC6-xVbOJvXBbBiIkaWJx-uOdwXp3NEuZA",
	authDomain: "chatup-ddcf8.firebaseapp.com",
	projectId: "chatup-ddcf8",
	storageBucket: "chatup-ddcf8.firebasestorage.app",
	messagingSenderId: "510679848324",
	appId: "1:510679848324:web:8fd91100b48ff347aab9d1",
	measurementId: "G-DTZT3VN40J",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Apaga todas as mensagens do Firestore
 */
async function clearAllMessages(confirm: boolean = false): Promise<void> {
	if (!confirm) {
		console.log('⚠️  ATENÇÃO: Este script vai apagar TODAS as mensagens do Firestore!');
		console.log('⚠️  Para confirmar, execute: npx ts-node scripts/clear-firestore-messages.ts --confirm');
		console.log('');
		console.log('Ou adicione --confirm ao comando.');
		return;
	}

	console.log('🚀 Iniciando limpeza de mensagens do Firestore...');
	console.log('');

	try {
		const messagesRef = collection(db, 'messages');
		let totalDeleted = 0;
		let batchCount = 0;
		const BATCH_SIZE = 500; // Firestore limita a 500 operações por batch

		// Loop para apagar em lotes (Firestore tem limite de operações)
		while (true) {
			// Buscar até BATCH_SIZE mensagens
			const q = query(messagesRef, limit(BATCH_SIZE));
			const snapshot = await getDocs(q);

			if (snapshot.empty) {
				break; // Não há mais mensagens
			}

			// Apagar cada documento
			const deletePromises = snapshot.docs.map(async (docSnapshot) => {
				await deleteDoc(doc(db, 'messages', docSnapshot.id));
			});

			await Promise.all(deletePromises);

			totalDeleted += snapshot.size;
			batchCount++;

			console.log(`✅ Lote ${batchCount}: ${snapshot.size} mensagens apagadas (Total: ${totalDeleted})`);

			// Se retornou menos que BATCH_SIZE, terminamos
			if (snapshot.size < BATCH_SIZE) {
				break;
			}
		}

		console.log('');
		console.log(`✅ Concluído! Total de mensagens apagadas: ${totalDeleted}`);
		console.log(`📊 Total de lotes processados: ${batchCount}`);
	} catch (error) {
		console.error('❌ Erro ao apagar mensagens:', error);
		throw error;
	}
}

// Executar script
const args = process.argv.slice(2);
const confirm = args.includes('--confirm') || args.includes('-y') || args.includes('--yes');

clearAllMessages(confirm)
	.then(() => {
		console.log('');
		console.log('✅ Script executado com sucesso!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Erro ao executar script:', error);
		process.exit(1);
	});

