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
	const { login, loginWithGoogle, isLoading, error, hasCompleteProfile, isAuthenticated } = useAuth();

	// Redirecionar quando autenticação mudar
	React.useEffect(() => {
		if (isAuthenticated && !isLoading) {
			if (hasCompleteProfile) {
				router.replace("/(tabs)");
			} else {
				router.replace("/(auth)/create-profile");
			}
		}
	}, [isAuthenticated, hasCompleteProfile, isLoading]);

	const handleLogin = async (credentials: LoginCredentials) => {
		try {
			await login(credentials);
			// Navegação será feita pelo useEffect acima
		} catch (error: any) {
			console.error("Login error:", error);
		}
	};

	const handleForgotPassword = () => {
		// TODO: Implementar navegação para recuperação de senha
		console.log("Forgot password pressed");
	};

	const handleSignUp = () => {
		router.push("/(auth)/signup");
	};

	const handleGoogleSignIn = async () => {
		try {
			await loginWithGoogle();
			// Navegação será feita pelo useEffect acima
		} catch (error: any) {
			console.error("Google sign in error:", error);
			// O erro já está sendo tratado no hook e exibido através do estado 'error'
		}
	};

	const handleFacebookSignIn = () => {
		// TODO: Implementar autenticação com Facebook
		console.log("Facebook sign in pressed");
	};

	return (
		<Container>
			<StatusBar barStyle="dark-content" />
			<LoginForm
				onSubmit={handleLogin}
				onForgotPassword={handleForgotPassword}
				onSignUp={handleSignUp}
				onGoogleSignIn={handleGoogleSignIn}
				onFacebookSignIn={handleFacebookSignIn}
				isLoading={isLoading}
				error={error}
			/>
		</Container>
	);
}
