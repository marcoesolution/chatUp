import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import styled, { useTheme } from 'styled-components/native';
import { useAuth } from '@/modules/auth';
import { useTranslation } from '@/core/i18n';

const Container = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const LoadingText = styled.Text`
	margin-top: ${(props) => props.theme.spacing.md}px;
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

export default function LogoutScreen() {
	const router = useRouter();
	const { logout } = useAuth();
	const theme = useTheme();
	const { t } = useTranslation();

	useEffect(() => {
		const performLogout = async () => {
			try {
				await logout();
				router.replace('/(auth)/login');
			} catch (error) {
				console.error('Logout error:', error);
				// Mesmo com erro, redireciona para login
				router.replace('/(auth)/login');
			}
		};

		performLogout();
	}, []);

	return (
		<Container>
			<ActivityIndicator size="large" color={theme.colors.button.primary} />
			<LoadingText>{t("auth.loggingOut")}</LoadingText>
		</Container>
	);
}

