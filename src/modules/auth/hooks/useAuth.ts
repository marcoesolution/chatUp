import { useFirebaseAuth } from "./useFirebaseAuth";
import type { LoginCredentials, RegisterData } from "../types";

/**
 * Hook principal de autenticação (wrapper do Firebase Auth)
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
		createProfile,
		logout,
	} = useFirebaseAuth();

	const login = async (credentials: LoginCredentials) => {
		await signIn(credentials.email, credentials.password);
	};

	const register = async (data: RegisterData) => {
		await signUp(data.email, data.password, data.name);
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
		createProfile,
		logout,
		isLoading,
		error,
	};
}
