import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { useRouter } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { MessageCircle } from "lucide-react-native";
import { LoginForm } from "@/modules/auth/components";
import { useAuth } from "@/modules/auth";
import type { LoginCredentials } from "@/modules/auth/types";

const Container = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Header = styled.View`
	padding: ${(props) => props.theme.spacing.lg}px;
	padding-top: 60px;
	align-items: center;
	background-color: transparent;
`;

const LogoContainer = styled.View`
	width: 90px;
	height: 90px;
	border-radius: 45px;
	background-color: ${(props) => props.theme.colors.button.primary};
	align-items: center;
	justify-content: center;
	margin-bottom: ${(props) => props.theme.spacing.xl}px;
	shadow-color: ${(props) => props.theme.colors.button.primary};
	shadow-offset: 0px 6px;
	shadow-opacity: 0.4;
	shadow-radius: 12px;
	elevation: 10;
`;

const LogoIconContainer = styled.View`
	justify-content: center;
	align-items: center;
`;

export default function LoginScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { login, isLoading, error, hasCompleteProfile, isAuthenticated } = useAuth();

	// Redirecionar se já estiver autenticado
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
		router.push("/(auth)/forgot-password");
	};

	const handleSignUp = () => {
		router.push("/(auth)/signup");
	};

	const handleGoogleSignIn = () => {
		// TODO: Implementar autenticação com Google
		console.log("Google sign in pressed");
		// Alert.alert("Em breve", "Autenticação com Google será implementada em breve");
	};

	const handleFacebookSignIn = () => {
		// TODO: Implementar autenticação com Facebook
		console.log("Facebook sign in pressed");
		// Alert.alert("Em breve", "Autenticação com Facebook será implementada em breve");
	};

	return (
		<Container>
			<StatusBar barStyle="light-content" />
			<Header>
				<LogoContainer>
					<LogoIconContainer>
						<MessageCircle
							size={48}
							color={theme.colors.background.primary}
							fill="#ffffff"
							strokeWidth={2}
						/>
					</LogoIconContainer>
				</LogoContainer>
			</Header>
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
