import { useBackendAuth } from "./useBackendAuth";
import type { LoginCredentials, RegisterData } from "../types";

/**
 * Hook principal de autenticação (wrapper do Backend Auth agora)
 * Mantém compatibilidade com a interface anterior
 */
export function useAuth() {
	const {
		user,
		userProfile,
		isAuthenticated,
		hasCompleteProfile,
		isLoading,
		error,
		signIn,
		signUp,
		signInWithGoogle,
		createProfile,
		logout,
		syncPhotoURL,
	} = useBackendAuth(); // Switched to Backend Auth

	const login = async (credentials: LoginCredentials) => {
		await signIn(credentials.email, credentials.password);
	};

	const register = async (data: RegisterData) => {
		await signUp(data.email, data.password, data.name);
	};

	const loginWithGoogle = async () => {
		await signInWithGoogle();
	};

	return {
		user: userProfile
			? {
					id: userProfile.id,
					email: userProfile.email,
					name: userProfile.displayName,
				}
			: null,
		firebaseUser: user, // Usuário do Firebase (com uid)
		userProfile,
		isAuthenticated,
		hasCompleteProfile,
		login,
		register,
		loginWithGoogle,
		createProfile,
		logout,
		syncPhotoURL,
		isLoading,
		error,
	};
}
