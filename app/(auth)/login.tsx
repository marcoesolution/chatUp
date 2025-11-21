import React from 'react';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { LoginForm } from '@/modules/auth/components';
import { useAuth } from '@/modules/auth';
import type { LoginCredentials } from '@/modules/auth/types';

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

export default function LoginScreen() {
	const router = useRouter();
	const { login, isLoading, error, hasCompleteProfile, isAuthenticated } = useAuth();

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
			console.error('Login error:', error);
		}
	};

	const handleForgotPassword = () => {
		// TODO: Implementar navegação para recuperação de senha
		console.log('Forgot password pressed');
	};

	const handleSignUp = () => {
		router.push("/(auth)/signup");
	};

	const handleGoogleSignIn = () => {
		// TODO: Implementar autenticação com Google
		console.log("Google sign in pressed");
	};

	const handleFacebookSignIn = () => {
		// TODO: Implementar autenticação com Facebook
		console.log("Facebook sign in pressed");
	};

	return (
		<Container>
			<StatusBar barStyle="light-content" />
			<Header>
				<LogoContainer>
					<LogoText>💬</LogoText>
				</LogoContainer>
				<Slogan>Unir pessoas próximas</Slogan>
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

