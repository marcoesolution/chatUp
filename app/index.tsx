import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import styled, { useTheme } from "styled-components/native";
import { useAuth } from "@/modules/auth";

const Container = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.primary};
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

	return (
		<Container>
			<ActivityIndicator size="large" color={theme.colors.button.primary} />
		</Container>
	);
}
