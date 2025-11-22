import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { useAuth } from "@/modules/auth";

const Container = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.primary};
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const ErrorText = styled.Text`
	color: ${(props) => props.theme.colors.status.error};
	font-size: 16px;
	text-align: center;
	margin-top: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ErrorHint = styled.Text`
	color: ${(props) => props.theme.colors.text.secondary};
	font-size: 14px;
	text-align: center;
	margin-top: ${(props) => props.theme.spacing.sm}px;
`;

export default function IndexScreen() {
	const router = useRouter();
	const { isAuthenticated, hasCompleteProfile, isLoading, error } = useAuth();
	const theme = useTheme();

	// Log de debug para identificar problemas
	useEffect(() => {
		console.log("🔍 IndexScreen: Inicializando...");
		console.log("🔍 IndexScreen: isLoading =", isLoading);
		console.log("🔍 IndexScreen: isAuthenticated =", isAuthenticated);
		console.log("🔍 IndexScreen: hasCompleteProfile =", hasCompleteProfile);
		console.log("🔍 IndexScreen: error =", error);
	}, []);

	useEffect(() => {
		console.log("🔍 IndexScreen: Estado mudou", {
			isLoading,
			isAuthenticated,
			hasCompleteProfile,
			error,
		});

		if (!isLoading) {
			try {
				// Se houver erro de configuração do Firebase, não redirecionar
				if (error && error.includes("Firebase não está configurado")) {
					console.error("❌ IndexScreen: Erro de configuração do Firebase. Não redirecionando.");
					return;
				}

				if (isAuthenticated) {
					if (hasCompleteProfile) {
						console.log("🔍 IndexScreen: Redirecionando para /(tabs)");
						router.replace("/(tabs)");
					} else {
						console.log("🔍 IndexScreen: Redirecionando para /(auth)/create-profile");
						router.replace("/(auth)/create-profile");
					}
				} else {
					console.log("🔍 IndexScreen: Redirecionando para /(auth)/login");
					router.replace("/(auth)/login");
				}
			} catch (err) {
				console.error("❌ IndexScreen: Erro ao navegar:", err);
			}
		}
	}, [isAuthenticated, hasCompleteProfile, isLoading, error]);

	// Se houver erro de configuração do Firebase, mostrar mensagem
	if (!isLoading && error && error.includes("Firebase não está configurado")) {
		return (
			<Container>
				<ErrorText>Erro de Configuração</ErrorText>
				<ErrorText>{error}</ErrorText>
				<ErrorHint>
					Verifique se as variáveis de ambiente do Firebase estão configuradas corretamente.
				</ErrorHint>
			</Container>
		);
	}

	return (
		<Container>
			<ActivityIndicator size="large" color={theme.colors.button.primary} />
			{error && !error.includes("Firebase não está configurado") && (
				<ErrorText style={{ marginTop: theme.spacing.md }}>{error}</ErrorText>
			)}
		</Container>
	);
}
