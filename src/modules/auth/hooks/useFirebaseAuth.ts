import { useState, useEffect } from "react";
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	updateProfile,
	signInWithCredential,
	GoogleAuthProvider,
	User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { auth, db } from "@/core/firebase";
import type { UserProfile, CreateProfileData } from "../types";

// Necessário para o AuthSession funcionar corretamente
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook para autenticação com Firebase
 */
export function useFirebaseAuth() {
	const [user, setUser] = useState<FirebaseUser | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Observar mudanças no estado de autenticação
	useEffect(() => {
		if (!auth) return;

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			setUser(firebaseUser);
			setIsLoading(true);

			if (firebaseUser) {
				// Buscar perfil do usuário no Firestore
				try {
					const profile = await getUserProfile(firebaseUser.uid);
					setUserProfile(profile);
				} catch (err: any) {
					console.error("Erro ao buscar perfil:", err);
					setUserProfile(null);
				}
			} else {
				setUserProfile(null);
			}

			setIsLoading(false);
		});

		return () => unsubscribe();
	}, []);

	/**
	 * Buscar perfil do usuário no Firestore
	 */
	const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
		if (!db) throw new Error("Firestore não está inicializado");

		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			return { id: userDoc.id, ...userDoc.data() } as UserProfile;
		}
		return null;
	};

	/**
	 * Login com email e senha
	 */
	const signIn = async (email: string, password: string) => {
		if (!auth) throw new Error("Firebase Auth não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			// O onAuthStateChanged vai atualizar o estado automaticamente
			// Mas buscamos o perfil aqui também para garantir
			const profile = await getUserProfile(userCredential.user.uid);
			setUserProfile(profile);
			return { user: userCredential.user, profile };
		} catch (err: any) {
			const errorMessage = getFirebaseErrorMessage(err.code);
			setError(errorMessage);
			setIsLoading(false);
			throw new Error(errorMessage);
		}
	};

	/**
	 * Criar nova conta
	 */
	const signUp = async (email: string, password: string, displayName: string) => {
		if (!auth) throw new Error("Firebase Auth não está inicializado");
		if (!db) throw new Error("Firestore não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			// Criar usuário no Firebase Auth
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);

			// Atualizar displayName no perfil do Auth
			await updateProfile(userCredential.user, {
				displayName,
			});

			// Aguardar um pouco para garantir que o perfil foi atualizado
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Criar documento básico do usuário no Firestore
			const userData = {
				email: userCredential.user.email || email,
				displayName,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				hasProfile: false, // Indica que precisa completar o perfil
			};

			await setDoc(doc(db, "users", userCredential.user.uid), userData);

			// Atualizar estado local
			setUser(userCredential.user);

			return { user: userCredential.user };
		} catch (err: any) {
			const errorMessage = getFirebaseErrorMessage(err.code);
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Criar perfil completo do usuário
	 */
	const createProfile = async (userId: string, profileData: CreateProfileData) => {
		if (!db) throw new Error("Firestore não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			const profileDoc = {
				...profileData,
				hasProfile: true,
				updatedAt: serverTimestamp(),
			};

			await setDoc(doc(db, "users", userId), profileDoc, { merge: true });

			// Atualizar estado local
			const updatedProfile = await getUserProfile(userId);
			setUserProfile(updatedProfile);

			return updatedProfile;
		} catch (err: any) {
			const errorMessage = getFirebaseErrorMessage(err.code);
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Login com Google
	 */
	const signInWithGoogle = async () => {
		if (!auth) throw new Error("Firebase Auth não está inicializado");
		if (!db) throw new Error("Firestore não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			// Configurar OAuth para Google
			// O Web Client ID deve ser obtido do Firebase Console
			// Authentication > Sign-in method > Google > Web client ID
			const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

			if (!webClientId) {
				const errorMsg =
					"Google Web Client ID não configurado. Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env";
				console.error(errorMsg);
				setError(errorMsg);
				setIsLoading(false);
				throw new Error(errorMsg);
			}

			// Configurar redirect URI
			const redirectUri = AuthSession.makeRedirectUri({
				useProxy: true,
			});

			console.log("🔐 Iniciando login com Google...");
			console.log("📋 Redirect URI:", redirectUri);

			// Criar URL de autorização manualmente sem PKCE
			const scopes = ["openid", "profile", "email"].join(" ");
			const state = Math.random().toString(36).substring(7);
			const nonce = Math.random().toString(36).substring(7);
			
			const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
				`client_id=${encodeURIComponent(webClientId)}&` +
				`redirect_uri=${encodeURIComponent(redirectUri)}&` +
				`response_type=id_token&` +
				`scope=${encodeURIComponent(scopes)}&` +
				`state=${state}&` +
				`nonce=${nonce}`;

			console.log("🔗 URL de autorização criada");

			// Abrir o navegador para autenticação usando WebBrowser
			const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

			console.log("📥 Resultado do OAuth:", result.type);

			if (result.type !== "success") {
				const errorMsg =
					result.type === "cancel"
						? "Autenticação com Google cancelada pelo usuário"
						: `Erro na autenticação: ${result.type}`;
				console.error("❌", errorMsg);
				setError(errorMsg);
				setIsLoading(false);
				throw new Error(errorMsg);
			}

			// Extrair o ID token da URL de retorno
			let idToken: string | null = null;
			
			if (result.type === "success" && result.url) {
				const url = new URL(result.url);
				// O token pode vir como fragmento (#id_token=...) ou como query param (?id_token=...)
				idToken = url.hash.split("id_token=")[1]?.split("&")[0] || 
				          url.searchParams.get("id_token");
			}

			// Fallback: tentar obter do resultado diretamente
			if (!idToken) {
				idToken =
					result.params?.id_token ||
					result.params?.idToken ||
					result.authentication?.idToken;
			}

			console.log("🔑 Token recebido:", idToken ? "Sim" : "Não");

			if (!idToken) {
				console.error("❌ Token não encontrado. Result params:", result.params);
				const errorMsg = "Token do Google não recebido. Tente novamente.";
				setError(errorMsg);
				setIsLoading(false);
				throw new Error(errorMsg);
			}

			// Criar credencial do Google para Firebase
			const googleCredential = GoogleAuthProvider.credential(idToken);

			// Fazer login no Firebase com a credencial do Google
			console.log("🔥 Fazendo login no Firebase...");
			const userCredential = await signInWithCredential(auth, googleCredential);

			console.log("✅ Login no Firebase bem-sucedido:", userCredential.user.email);

			// Verificar se o usuário já tem perfil no Firestore
			let profile = await getUserProfile(userCredential.user.uid);

			// Se não tiver perfil, criar um básico
			if (!profile) {
				console.log("📝 Criando perfil no Firestore...");
				const userData = {
					email: userCredential.user.email || "",
					displayName: userCredential.user.displayName || "",
					photoURL: userCredential.user.photoURL || null,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
					hasProfile: false, // Pode precisar completar o perfil
				};

				await setDoc(doc(db, "users", userCredential.user.uid), userData);
				profile = await getUserProfile(userCredential.user.uid);
			}

			// Atualizar estado local
			setUserProfile(profile);
			setIsLoading(false);

			console.log("✅ Login com Google concluído com sucesso!");

			return { user: userCredential.user, profile };
		} catch (err: any) {
			console.error("❌ Erro no login com Google:", err);
			console.error("❌ Detalhes do erro:", {
				message: err.message,
				code: err.code,
				stack: err.stack,
			});
			const errorMessage =
				err.message || getFirebaseErrorMessage(err.code) || "Erro ao fazer login com Google";
			setError(errorMessage);
			setIsLoading(false);
			// Relançar o erro para que o componente possa tratá-lo
			throw err;
		}
	};

	/**
	 * Logout
	 */
	const logout = async () => {
		if (!auth) throw new Error("Firebase Auth não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			await signOut(auth);
			setUser(null);
			setUserProfile(null);
		} catch (err: any) {
			const errorMessage = getFirebaseErrorMessage(err.code);
			setError(errorMessage);
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Verificar se o usuário tem perfil completo
	 */
	const hasCompleteProfile = userProfile?.hasProfile ?? false;

	return {
		user,
		userProfile,
		isAuthenticated: !!user,
		hasCompleteProfile,
		isLoading,
		error,
		signIn,
		signUp,
		signInWithGoogle,
		createProfile,
		logout,
		refreshProfile: () => user && getUserProfile(user.uid).then(setUserProfile),
	};
}

/**
 * Converter códigos de erro do Firebase para mensagens amigáveis
 */
function getFirebaseErrorMessage(code: string): string {
	const errorMessages: Record<string, string> = {
		"auth/email-already-in-use": "Este email já está em uso",
		"auth/invalid-email": "Email inválido",
		"auth/operation-not-allowed": "Operação não permitida",
		"auth/weak-password": "Senha muito fraca. Use pelo menos 6 caracteres",
		"auth/user-disabled": "Esta conta foi desabilitada",
		"auth/user-not-found": "Usuário não encontrado",
		"auth/wrong-password": "Senha incorreta",
		"auth/invalid-credential": "Credenciais inválidas",
		"auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde",
		"auth/network-request-failed": "Erro de conexão. Verifique sua internet",
	};

	return errorMessages[code] || "Ocorreu um erro. Tente novamente";
}

