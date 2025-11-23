import { useState, useEffect, useRef, useCallback } from "react";
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
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { auth, db } from "@/core/firebase";
import { clearAllKeys } from "@/core/security";
import { useLocation } from "@/modules/location";
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

	// Hook de localização para atualizar posição do usuário
	const { location: userLocation, permissionStatus } = useLocation();
	const lastLocationUpdateRef = useRef<{ lat: number; lon: number } | null>(null);

	// Observar mudanças no estado de autenticação
	useEffect(() => {
		// Se Firebase não estiver inicializado, definir loading como false e mostrar erro
		if (!auth || !db) {
			console.error("❌ Firebase não está inicializado. Auth:", !!auth, "DB:", !!db);
			setError("Firebase não está configurado. Verifique as variáveis de ambiente.");
			setIsLoading(false);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			setUser(firebaseUser);
			setIsLoading(true);

			if (firebaseUser) {
				// Buscar perfil do usuário no Firestore
				try {
					let profile = await getUserProfile(firebaseUser.uid);

					// Se o usuário tem photoURL no Firebase Auth mas não no Firestore, atualizar
					// Isso garante que a foto do Google sempre seja sincronizada
					if (
						firebaseUser.photoURL &&
						(!profile || !profile.photoURL || profile.photoURL !== firebaseUser.photoURL)
					) {
						if (!db) {
							console.error("❌ Firestore não está inicializado. Não é possível sincronizar photoURL.");
							return;
						}

						console.log("🔄 Sincronizando photoURL do Google com Firestore...");
						console.log("📸 PhotoURL do Firebase Auth:", firebaseUser.photoURL);
						const updateData: any = {
							photoURL: firebaseUser.photoURL,
							updatedAt: serverTimestamp(),
						};

						// Se não tiver perfil, criar um básico
						if (!profile) {
							updateData.email = firebaseUser.email || "";
							updateData.displayName = firebaseUser.displayName || "";
							updateData.createdAt = serverTimestamp();
							updateData.hasProfile = false;
							console.log("📝 Criando perfil básico com photoURL do Google");
						} else {
							console.log("🔄 Atualizando perfil existente com photoURL do Google");
						}

						await setDoc(doc(db, "users", firebaseUser.uid), updateData, { merge: true });
						profile = await getUserProfile(firebaseUser.uid);
						console.log("✅ PhotoURL sincronizado. Valor salvo:", profile?.photoURL);
					}

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

		// Timeout de segurança: se após 10 segundos ainda estiver carregando, forçar parar
		const timeoutId = setTimeout(() => {
			console.warn("⚠️ Timeout: Loading de autenticação demorou mais de 10 segundos. Forçando parada.");
			setIsLoading(false);
		}, 10000);

		return () => {
			unsubscribe();
			clearTimeout(timeoutId);
		};
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
		if (!db) throw new Error("Firestore não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			console.log("✅ Login com email/senha bem-sucedido:", userCredential.user.email);

			// Buscar perfil do usuário no Firestore
			let profile = await getUserProfile(userCredential.user.uid);

			// Se o usuário não tem photoURL no Firebase Auth (login com email/senha não fornece),
			// mas tem no Firestore, manter o que está salvo
			// Se não tem em nenhum lugar, não há foto disponível
			if (!userCredential.user.photoURL && profile && !profile.photoURL) {
				console.warn(
					"⚠️ Login com email/senha não fornece photoURL. Para ter a foto do Google, faça login com Google."
				);
			}

			// O onAuthStateChanged vai atualizar o estado automaticamente
			// Mas buscamos o perfil aqui também para garantir
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
		if (!auth) throw new Error("Firebase Auth não está inicializado");

		setError(null);
		setIsLoading(true);

		try {
			// Buscar o usuário atual do Firebase Auth para preservar o photoURL
			const currentUser = auth.currentUser;

			const profileDoc: any = {
				...profileData,
				hasProfile: true,
				updatedAt: serverTimestamp(),
			};

			// IMPORTANTE: Sempre preservar o photoURL do Firebase Auth se existir
			// Isso garante que a foto do Google não seja perdida ao completar o perfil
			if (currentUser?.photoURL) {
				profileDoc.photoURL = currentUser.photoURL;
				console.log("✅ Preservando photoURL do Google ao criar perfil:", currentUser.photoURL);
			} else if (profileData.photoURL) {
				// Se não tiver no Firebase Auth, usar o que veio no profileData
				profileDoc.photoURL = profileData.photoURL;
				console.log("✅ Usando photoURL do profileData:", profileData.photoURL);
			} else {
				console.warn("⚠️ Nenhum photoURL disponível para salvar");
			}

			console.log("📦 Dados do perfil que serão salvos:", JSON.stringify(profileDoc, null, 2));
			await setDoc(doc(db, "users", userId), profileDoc, { merge: true });

			// Atualizar estado local
			const updatedProfile = await getUserProfile(userId);
			setUserProfile(updatedProfile);
			console.log("✅ Perfil criado. PhotoURL salvo:", updatedProfile?.photoURL);

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

			console.log("🔑 Web Client ID configurado:", webClientId.substring(0, 20) + "...");

			// Configurar redirect URI usando o proxy do Expo
			// O slug do projeto está em app.json (atualmente "chatUp")
			// O formato do proxy do Expo é: https://auth.expo.io/@anonymous/[slug]
			// IMPORTANTE: O slug deve corresponder EXATAMENTE ao app.json
			// O Expo usa o slug em minúsculas no proxy: "chatup"
			const redirectUri = `https://auth.expo.io/@anonymous/chatup`;

			console.log("🔐 Iniciando login com Google...");
			console.log("📋 Redirect URI:", redirectUri);
			console.log("📋 ⚠️ IMPORTANTE: Este URI EXATO deve estar no Google Cloud Console!");
			console.log("📋 Vá em: Google Cloud Console > APIs e Serviços > Credenciais");
			console.log("📋 Encontre seu OAuth Client ID e adicione este URI:");
			console.log("📋", redirectUri);

			// Criar URL de autorização manualmente
			// Usar WebBrowser.openAuthSessionAsync que deve usar o navegador do sistema
			const scopes = ["openid", "profile", "email"].join(" ");
			const state = Math.random().toString(36).substring(7);
			const nonce = Math.random().toString(36).substring(7);

			const authUrl =
				`https://accounts.google.com/o/oauth2/v2/auth?` +
				`client_id=${encodeURIComponent(webClientId)}&` +
				`redirect_uri=${encodeURIComponent(redirectUri)}&` +
				`response_type=id_token&` +
				`scope=${encodeURIComponent(scopes)}&` +
				`state=${state}&` +
				`nonce=${nonce}`;

			console.log("🔗 URL de autorização criada");
			console.log("📋 Redirect URI:", redirectUri);
			console.log("⚠️ Se aparecer erro 403, o Google pode estar bloqueando WebView");
			console.log("⚠️ Tente usar o app em um dispositivo físico ou emulador Android/iOS");

			// Abrir no navegador do sistema
			// No Android/iOS, isso deve usar Custom Tabs/ASWebAuthenticationSession
			// que são considerados navegadores seguros pelo Google
			const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

			console.log("📥 Resultado do OAuth:", result.type);
			if (result.type === "success" && result.url) {
				console.log("✅ URL de retorno recebida:", result.url.substring(0, 200));
			}

			if (result.type !== "success") {
				// Tratar diferentes tipos de cancelamento/erro de forma mais amigável
				let errorMsg = "";
				let shouldThrow = true;

				if (result.type === "cancel" || result.type === "dismiss") {
					errorMsg = "Autenticação com Google cancelada. Você pode tentar novamente quando quiser.";
					shouldThrow = false; // Não lançar erro para cancelamento, apenas informar
					console.log("ℹ️", errorMsg);
				} else {
					errorMsg = `Erro na autenticação: ${result.type}`;
					console.error("❌", errorMsg);
				}

				setError(errorMsg);
				setIsLoading(false);

				// Apenas lançar erro se não for um cancelamento
				if (shouldThrow) {
					throw new Error(errorMsg);
				} else {
					// Para cancelamento, apenas retornar sem fazer nada
					return;
				}
			}

			// Extrair o ID token da URL de retorno
			let idToken: string | null = null;

			if (result.type === "success" && result.url) {
				const url = new URL(result.url);
				// O token pode vir como fragmento (#id_token=...) ou como query param (?id_token=...)
				idToken = url.hash.split("id_token=")[1]?.split("&")[0] || url.searchParams.get("id_token");

				// Também tentar extrair do fragmento completo caso o formato seja diferente
				if (!idToken && url.hash) {
					const hashParams = new URLSearchParams(url.hash.substring(1));
					idToken = hashParams.get("id_token");
				}
			}

			console.log("🔑 Token recebido:", idToken ? "Sim" : "Não");

			if (!idToken) {
				console.error("❌ Token não encontrado na URL de retorno:", result.url?.substring(0, 200));
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
			console.log("📸 PhotoURL do Google:", userCredential.user.photoURL);

			// Verificar se o usuário já tem perfil no Firestore
			let profile = await getUserProfile(userCredential.user.uid);

			// Preparar dados do Google para atualizar
			// IMPORTANTE: Sempre incluir photoURL se existir no Firebase Auth
			const googleUserData: any = {
				email: userCredential.user.email || "",
				displayName: userCredential.user.displayName || "",
				updatedAt: serverTimestamp(),
			};

			// Adicionar photoURL apenas se existir (não usar null para não sobrescrever)
			if (userCredential.user.photoURL) {
				googleUserData.photoURL = userCredential.user.photoURL;
				console.log("✅ photoURL será salvo:", userCredential.user.photoURL);
			} else {
				console.warn("⚠️ photoURL não está disponível no Firebase Auth");
			}

			// Se não tiver perfil, criar um básico
			if (!profile) {
				console.log("📝 Criando perfil no Firestore com dados do Google...");
				const userData = {
					...googleUserData,
					createdAt: serverTimestamp(),
					hasProfile: false, // Pode precisar completar o perfil
				};

				console.log("📦 Dados que serão salvos:", JSON.stringify(userData, null, 2));
				await setDoc(doc(db, "users", userCredential.user.uid), userData);
				profile = await getUserProfile(userCredential.user.uid);
				console.log("✅ Perfil criado. PhotoURL salvo:", profile?.photoURL);
			} else {
				// Se já tiver perfil, atualizar com os dados mais recentes do Google
				// Isso garante que photoURL e displayName sempre estejam atualizados
				console.log("🔄 Atualizando perfil com dados do Google...");
				console.log("📦 Dados que serão atualizados:", JSON.stringify(googleUserData, null, 2));
				await setDoc(doc(db, "users", userCredential.user.uid), googleUserData, { merge: true });
				profile = await getUserProfile(userCredential.user.uid);
				console.log("✅ Perfil atualizado. PhotoURL salvo:", profile?.photoURL);
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
			const errorMessage = err.message || getFirebaseErrorMessage(err.code) || "Erro ao fazer login com Google";
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
			// Limpar chaves de criptografia antes de fazer logout
			try {
				await clearAllKeys();
				console.log("🔒 Chaves de criptografia removidas");
			} catch (keyError) {
				console.warn("⚠️ Erro ao limpar chaves de criptografia:", keyError);
				// Não falhar o logout se houver erro ao limpar chaves
			}

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

	/**
	 * Sincronizar photoURL do Firebase Auth com o Firestore
	 */
	const syncPhotoURL = async () => {
		if (!user || !db) return;

		try {
			// Verificar se o Firebase Auth tem photoURL mas o Firestore não tem
			if (user.photoURL && (!userProfile || !userProfile.photoURL || userProfile.photoURL !== user.photoURL)) {
				console.log("🔄 Forçando sincronização do photoURL do Google com Firestore...");
				const updateData: any = {
					photoURL: user.photoURL,
					updatedAt: serverTimestamp(),
				};

				// Se não tiver perfil, criar um básico
				if (!userProfile) {
					updateData.email = user.email || "";
					updateData.displayName = user.displayName || "";
					updateData.createdAt = serverTimestamp();
					updateData.hasProfile = false;
				}

				await setDoc(doc(db, "users", user.uid), updateData, { merge: true });
				const updatedProfile = await getUserProfile(user.uid);
				setUserProfile(updatedProfile);
				console.log("✅ photoURL sincronizado com sucesso:", user.photoURL);
			}
		} catch (err: any) {
			console.error("❌ Erro ao sincronizar photoURL:", err);
		}
	};

	/**
	 * Atualizar localização do usuário no Firestore
	 */
	const updateUserLocation = useCallback(async () => {
		if (!user || !db || !userLocation || !permissionStatus?.granted) {
			return;
		}

		try {
			// Verificar se a localização mudou significativamente (mais de 10 metros)
			const lastLocation = lastLocationUpdateRef.current;
			if (
				lastLocation &&
				Math.abs(lastLocation.lat - userLocation.latitude) < 0.0001 &&
				Math.abs(lastLocation.lon - userLocation.longitude) < 0.0001
			) {
				// Localização não mudou significativamente, não atualizar
				return;
			}

			const locationData = {
				location: {
					latitude: userLocation.latitude,
					longitude: userLocation.longitude,
					updatedAt:
						userLocation.updatedAt instanceof Date
							? Timestamp.fromDate(userLocation.updatedAt)
							: userLocation.updatedAt,
				},
				isLocationEnabled: true,
				updatedAt: serverTimestamp(),
			};

			await setDoc(doc(db, "users", user.uid), locationData, { merge: true });

			// Atualizar referência da última localização
			lastLocationUpdateRef.current = {
				lat: userLocation.latitude,
				lon: userLocation.longitude,
			};

			// Atualizar perfil local se necessário
			if (userProfile) {
				setUserProfile({
					...userProfile,
					location: userLocation,
					isLocationEnabled: true,
				});
			}

			console.log("📍 Localização atualizada no Firestore:", {
				latitude: userLocation.latitude,
				longitude: userLocation.longitude,
			});
		} catch (err: any) {
			console.error("❌ Erro ao atualizar localização:", err);
		}
	}, [user, db, userLocation, permissionStatus, userProfile]);

	/**
	 * Efeito para atualizar localização no Firestore quando a localização muda
	 */
	useEffect(() => {
		if (user && userLocation && permissionStatus?.granted) {
			updateUserLocation();
		}
	}, [user, userLocation, permissionStatus, updateUserLocation]);

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
		syncPhotoURL,
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
