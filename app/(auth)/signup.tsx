import React from "react";
import { StatusBar, Alert } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { SignUpForm } from "@/modules/auth/components";
import { useAuth } from "@/modules/auth";
import type { RegisterData } from "@/modules/auth/types";

const Container = styled.View`
	flex: 1;
	background-color: #ffffff;
`;

const Header = styled.View`
	padding: 24px;
	padding-top: 60px;
	background-color: #667eea;
	align-items: center;
`;

const LogoContainer = styled.View`
	width: 80px;
	height: 80px;
	border-radius: 40px;
	background-color: #ffffff;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
	shadow-color: #000;
	shadow-offset: 0px 4px;
	shadow-opacity: 0.2;
	shadow-radius: 8px;
	elevation: 8;
`;

const LogoText = styled.Text`
	font-size: 32px;
	font-weight: 800;
	color: #667eea;
`;

const Slogan = styled.Text`
	font-size: 14px;
	color: #ffffff;
	font-weight: 600;
	opacity: 0.9;
	letter-spacing: 0.5px;
`;

export default function SignUpScreen() {
	const router = useRouter();
	const { register, isLoading, error } = useAuth();

	const handleSignUp = async (data: RegisterData) => {
		try {
			await register(data);
			// Após registro bem-sucedido, redirecionar para criação de perfil
			router.replace("/(auth)/create-profile");
		} catch (err: any) {
			Alert.alert("Erro", err.message || "Não foi possível criar a conta. Tente novamente.");
		}
	};

	const handleGoToLogin = () => {
		router.replace("/(auth)/login");
	};

	return (
		<Container>
			<StatusBar barStyle="light-content" />
			<Header>
				<LogoContainer>
					<LogoText>💬</LogoText>
				</LogoContainer>
				<Slogan>Crie sua conta</Slogan>
			</Header>
			<SignUpForm onSubmit={handleSignUp} onGoToLogin={handleGoToLogin} isLoading={isLoading} error={error} />
		</Container>
	);
}

