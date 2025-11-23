import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { initI18n } from "./index";

interface I18nProviderProps {
	children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		const initialize = async () => {
			try {
				await initI18n();
				setIsReady(true);
			} catch (error) {
				console.error("❌ Erro ao inicializar i18n:", error);
				setIsReady(true); // Continuar mesmo com erro
			}
		};

		initialize();
	}, []);

	if (!isReady) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return <>{children}</>;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#ffffff",
	},
});

