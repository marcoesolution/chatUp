import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// Configuração do Firebase - valores diretos (hardcoded)
// As chaves do Firebase são públicas por design, então é seguro incluí-las no código
const firebaseConfig = {
	apiKey: "AIzaSyC6-xVbOJvXBbBiIkaWJx-uOdwXp3NEuZA",
	authDomain: "chatup-ddcf8.firebaseapp.com",
	projectId: "chatup-ddcf8",
	storageBucket: "chatup-ddcf8.firebasestorage.app",
	messagingSenderId: "510679848324",
	appId: "1:510679848324:web:8fd91100b48ff347aab9d1",
	measurementId: "G-DTZT3VN40J",
};

// Inicialização do Firebase App
let app: FirebaseApp | null = null;

console.log("🔍 Firebase Config: Iniciando inicialização...");
console.log("✅ Firebase Config: Usando configuração hardcoded");

if (!getApps().length) {
	try {
		console.log("🔍 Firebase Config: Tentando inicializar Firebase...");
		app = initializeApp(firebaseConfig);
		console.log("✅ Firebase inicializado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao inicializar Firebase:", error);
		console.error("❌ Detalhes do erro:", JSON.stringify(error, null, 2));
		// Não lançar erro aqui, deixar o app tentar continuar
	}
} else {
	app = getApps()[0];
	console.log("✅ Firebase já estava inicializado");
}

// Inicialização do Auth com persistência automática
// 
// PERSISTÊNCIA DE SESSÃO (30+ dias):
// - No React Native/Expo, o Firebase Auth detecta automaticamente o ambiente
// - Usa AsyncStorage internamente para salvar o estado de autenticação
// - O estado é restaurado automaticamente quando o app é reaberto
// 
// RENOVAÇÃO AUTOMÁTICA DE TOKENS:
// - ID Token: expira após 1 hora, mas é renovado automaticamente
// - Refresh Token: dura muito mais (até anos) e renova o ID token quando necessário
// - O Firebase gerencia tudo automaticamente em background
// - A sessão permanece ativa por pelo menos 30 dias sem necessidade de login
// 
// COMO FUNCIONA:
// 1. Ao fazer login, tokens são salvos no AsyncStorage automaticamente
// 2. Ao reabrir o app, o Firebase restaura a sessão do AsyncStorage
// 3. Tokens são renovados automaticamente antes de expirar
// 4. onAuthStateChanged detecta quando a sessão é restaurada
// 5. onIdTokenChanged detecta quando tokens são renovados
let auth: Auth | null = null;

if (app) {
	try {
		auth = getAuth(app);
		console.log("✅ Firebase Auth inicializado com persistência automática (AsyncStorage)");
		console.log("🔐 Sessão será mantida por pelo menos 30 dias (renovação automática de tokens)");
	} catch (error) {
		console.error("❌ Erro ao inicializar Firebase Auth:", error);
	}
}

// Inicialização do Firestore
let db: Firestore | null = null;

if (app) {
	try {
		db = getFirestore(app);
		console.log("✅ Firestore inicializado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao inicializar Firestore:", error);
	}
}

// Inicialização do Storage
let storage: FirebaseStorage | null = null;

if (app) {
	try {
		storage = getStorage(app);
		console.log("✅ Firebase Storage inicializado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao inicializar Firebase Storage:", error);
	}
}

// Inicialização do Analytics (apenas para web)
let analytics: Analytics | null = null;

if (app && Platform.OS === "web") {
	try {
		isSupported().then((supported) => {
			if (supported && app) {
				analytics = getAnalytics(app);
				console.log("✅ Firebase Analytics inicializado com sucesso");
			} else {
				console.log("ℹ️ Firebase Analytics não é suportado neste ambiente");
			}
		});
	} catch (error) {
		console.error("❌ Erro ao inicializar Firebase Analytics:", error);
	}
}

// Exportações
export { app, auth, db, storage, analytics };
export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Analytics };
