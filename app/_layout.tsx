import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/queryClient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { I18nProvider } from "@/core/i18n/I18nProvider";
import { UpdateDialog } from "@/shared/components";
import React, { Suspense } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// Inicializa o Firebase quando o app inicia
import "@/core/firebase";

// Error Boundary para capturar erros de inicialização
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("❌ Erro capturado pelo ErrorBoundary:", error);
		console.error("❌ Stack trace:", error.stack);
		console.error("❌ Component stack:", errorInfo.componentStack);
		// Em produção, você pode enviar isso para um serviço de crash reporting
		if (__DEV__) {
			console.error("❌ Error info completo:", errorInfo);
		}
	}

	render() {
		if (this.state.hasError) {
			// Usar textos hardcoded aqui pois o i18n pode não estar inicializado ainda
			return (
				<View style={styles.errorContainer}>
					<Text style={styles.errorTitle}>Erro ao carregar o app</Text>
					<Text style={styles.errorText}>{this.state.error?.message || "Erro desconhecido"}</Text>
					<Text style={styles.errorHint}>Verifique os logs para mais detalhes</Text>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#000",
	},
	errorText: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		marginBottom: 10,
	},
	errorHint: {
		fontSize: 12,
		color: "#999",
		textAlign: "center",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},
});

// Loading fallback para lazy loading
const LoadingFallback = () => (
	<View style={styles.loadingContainer}>
		<ActivityIndicator size="large" color="#007AFF" />
	</View>
);

function AppContent() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<Stack
				screenOptions={{
					headerStyle: {
						backgroundColor: "#007AFF",
					},
					headerTintColor: "#fff",
					headerTitleStyle: {
						fontWeight: "bold",
					},
					// Expo Router já faz lazy loading automático de rotas
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="(tabs)"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="(auth)"
					options={{
						headerShown: false,
					}}
				/>
			</Stack>
		</Suspense>
	);
}

export default function RootLayout() {
	return (
		<ErrorBoundary>
			<SafeAreaProvider>
				<I18nProvider>
					<ThemeProvider>
						<QueryClientProvider client={queryClient}>
							<AppContent />
							<UpdateDialog />
						</QueryClientProvider>
					</ThemeProvider>
				</I18nProvider>
			</SafeAreaProvider>
		</ErrorBoundary>
	);
}
