import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { LoginForm } from "@/modules/auth/components";
import { useAuth } from "@/modules/auth";
import type { LoginCredentials } from "@/modules/auth/types";

const Container = styled(SafeAreaView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

export default function LoginScreen() {
	const router = useRouter();
	const { login, loginWithGoogle, isAuthenticated, hasCompleteProfile } = useAuth();

	// NOVO: Hook useActionState (React 19)
	// Encapsula o estado da ação, o carregamento (isPending) e o resultado (error/success)
	const [error, loginAction, isPending] = React.useActionState(
		async (prevState: string | null, credentials: LoginCredentials) => {
			try {
				await login(credentials);
				return null; // Sucesso, sem erro
			} catch (err: any) {
				console.error("Login action error:", err);
				return err.message || "Erro ao fazer login";
			}
		},
		null // Estado inicial
	);

	// Redirecionar quando autenticação mudar
	React.useEffect(() => {
		if (isAuthenticated && !isPending) {
			if (hasCompleteProfile) {
				router.replace("/(tabs)");
			} else {
				router.replace("/(auth)/create-profile");
			}
		}
	}, [isAuthenticated, hasCompleteProfile, isPending]);

	const handleForgotPassword = () => {
		console.log("Forgot password pressed");
	};

	const handleSignUp = () => {
		router.push("/(auth)/signup");
	};

	const handleGoogleSignIn = async () => {
		try {
			await loginWithGoogle();
		} catch (error: any) {
			console.error("Google sign in error:", error);
		}
	};

	const handleFacebookSignIn = () => {
		console.log("Facebook sign in pressed");
	};

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<LoginForm
				onSubmit={loginAction} // Passamos o loginAction diretamente
				onForgotPassword={handleForgotPassword}
				onSignUp={handleSignUp}
				onGoogleSignIn={handleGoogleSignIn}
				onFacebookSignIn={handleFacebookSignIn}
				isLoading={isPending} // Usamos o isPending do useActionState
				error={error} // Usamos o error do useActionState
			/>
		</Container>
	);
}
