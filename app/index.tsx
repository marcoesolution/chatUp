import React from "react";
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
	const { login, isLoading } = useAuth();

	const handleLogin = async (credentials: LoginCredentials) => {
		try {
			login(credentials);
			// Navegação será feita após login bem-sucedido
		} catch (error) {
			console.error("Login error:", error);
		}
	};

	const handleForgotPassword = () => {
		// TODO: Implementar navegação para recuperação de senha
		console.log("Forgot password pressed");
		router.push("/(auth)/forgot-password");
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
			<LoginForm onSubmit={handleLogin} onForgotPassword={handleForgotPassword} isLoading={isLoading} />
		</Container>
	);
}
