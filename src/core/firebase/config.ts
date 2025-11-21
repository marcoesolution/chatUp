import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// Configuração do Firebase
// As variáveis de ambiente devem ser configuradas no arquivo .env
const firebaseConfig = {
	apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
	measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opcional
};

// Validação das variáveis de ambiente
const requiredEnvVars = [
	"EXPO_PUBLIC_FIREBASE_API_KEY",
	"EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
	"EXPO_PUBLIC_FIREBASE_PROJECT_ID",
	"EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
	"EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
	"EXPO_PUBLIC_FIREBASE_APP_ID",
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
	const errorMessage = `⚠️ Firebase: Variáveis de ambiente faltando: ${missingEnvVars.join(", ")}\n⚠️ Firebase: Certifique-se de configurar as variáveis no EAS Build ou no arquivo .env`;
	console.error(errorMessage);
	
	// Em produção, lançar erro para que seja capturado pelo ErrorBoundary
	if (process.env.NODE_ENV === 'production') {
		throw new Error(`Firebase não configurado: ${missingEnvVars.join(", ")}`);
	}
}

// Inicialização do Firebase App
let app: FirebaseApp | null = null;

if (!getApps().length) {
	try {
		app = initializeApp(firebaseConfig);
		console.log("✅ Firebase inicializado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao inicializar Firebase:", error);
	}
} else {
	app = getApps()[0];
	console.log("✅ Firebase já estava inicializado");
}

// Inicialização do Auth
// getAuth funciona automaticamente com Expo/React Native e usa AsyncStorage para persistência
let auth: Auth | null = null;

if (app) {
	try {
		auth = getAuth(app);
		console.log("✅ Firebase Auth inicializado com sucesso");
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
