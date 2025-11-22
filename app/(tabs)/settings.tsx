import React, { useEffect } from "react";
import { ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppUpdate } from "@/modules/update";
import { Button } from "@/shared/components";

const Container = styled(SafeAreaView).attrs({
	edges: ["top"],
})`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Content = styled(ScrollView)`
	flex: 1;
	padding: ${(props) => props.theme.spacing.lg}px;
`;

const Section = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.xl}px;
`;

const SectionTitle = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.lg}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.bold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SectionDescription = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const ButtonContainer = styled.View`
	width: 100%;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const StatusContainer = styled.View`
	flex-direction: row;
	align-items: center;
	margin-top: ${(props) => props.theme.spacing.md}px;
	padding: ${(props) => props.theme.spacing.md}px;
	background-color: ${(props) => props.theme.colors.background.secondary};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
`;

const StatusText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-left: ${(props) => props.theme.spacing.sm}px;
	flex: 1;
`;

const ErrorText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.status.error};
	margin-top: ${(props) => props.theme.spacing.sm}px;
`;

const SuccessText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.status.success || props.theme.colors.button.primary};
	margin-top: ${(props) => props.theme.spacing.sm}px;
`;

export default function SettingsScreen() {
	const theme = useTheme();
	const { isUpdateAvailable, isChecking, isDownloading, error, checkForUpdates, downloadAndReload } = useAppUpdate();

	const handleCheckUpdates = async () => {
		try {
			const result = await checkForUpdates();

			if (result === null) {
				// Em desenvolvimento ou erro - o useEffect vai mostrar o alert de erro se necessário
				return;
			}

			if (result.isAvailable) {
				// Mostrar alert com atualização disponível
				const message =
					result.message || "Uma nova versão do aplicativo está disponível com melhorias e correções.";
				Alert.alert("Atualização Disponível", message + "\n\nDeseja instalar a atualização agora?", [
					{
						text: "Cancelar",
						style: "cancel",
					},
					{
						text: "OK",
						onPress: handleUpdate,
					},
				]);
			} else {
				// Mostrar alert informando que está atualizado
				Alert.alert("App Atualizado", "Você está usando a versão mais recente do aplicativo.", [
					{ text: "OK" },
				]);
			}
		} catch (err) {
			// Tratar erro se necessário
			console.error("Erro ao verificar atualizações:", err);
		}
	};

	const handleUpdate = async () => {
		await downloadAndReload();
	};

	// Mostrar alert de erro quando houver erro
	useEffect(() => {
		if (error && !isChecking) {
			Alert.alert("Erro ao Verificar Atualizações", error, [{ text: "OK" }]);
		}
	}, [error, isChecking]);

	return (
		<Container>
			<Content>
				<Section>
					<SectionTitle>Atualizações do App</SectionTitle>
					<SectionDescription>
						Verifique e instale atualizações disponíveis do aplicativo. As atualizações são instaladas
						automaticamente, mas você pode verificar manualmente aqui.
					</SectionDescription>

					<ButtonContainer>
						<Button
							title="Verificar Atualizações"
							onPress={handleCheckUpdates}
							variant="primary"
							loading={isChecking}
							disabled={isChecking || isDownloading}
						/>
					</ButtonContainer>

					{isUpdateAvailable && (
						<>
							<ButtonContainer>
								<Button
									title={isDownloading ? "Baixando e Instalando..." : "Instalar Atualização"}
									onPress={handleUpdate}
									variant="save"
									loading={isDownloading}
									disabled={isDownloading}
								/>
							</ButtonContainer>
							<SuccessText>
								✓ Nova atualização disponível! Clique em "Instalar Atualização" para aplicar.
							</SuccessText>
						</>
					)}

					{isChecking && (
						<StatusContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
							<StatusText>Verificando atualizações...</StatusText>
						</StatusContainer>
					)}

					{!isUpdateAvailable && !isChecking && !error && (
						<StatusContainer>
							<Ionicons
								name="checkmark-circle"
								size={20}
								color={theme.colors.status.success || theme.colors.button.primary}
							/>
							<StatusText>Você está usando a versão mais recente do app.</StatusText>
						</StatusContainer>
					)}

					{error && <ErrorText>Erro: {error}</ErrorText>}
				</Section>
			</Content>
		</Container>
	);
}
