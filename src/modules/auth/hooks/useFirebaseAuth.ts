import { useState, useEffect } from "react";
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	updateProfile,
	User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/core/firebase";
import type { UserProfile, CreateProfileData } from "../types";

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

