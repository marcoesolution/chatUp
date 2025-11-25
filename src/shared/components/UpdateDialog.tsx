import React from "react";
import { Modal, View, Text, ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "./Button";
import { useTranslation } from "@/core/i18n";
import { useUpdates } from "@/core/hooks/useUpdates";

const ModalContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
`;

const DialogContainer = styled.View`
	background-color: ${(props) => props.theme.colors.background.primary};
	border-radius: ${(props) => props.theme.borderRadius.lg}px;
	padding: ${(props) => props.theme.spacing.xl}px;
	margin: ${(props) => props.theme.spacing.lg}px;
	min-width: 300px;
	max-width: 90%;
`;

const Title = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.xl}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.bold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: ${(props) => props.theme.spacing.md}px;
	text-align: center;
`;

const Message = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	text-align: center;
`;

const ButtonContainer = styled.View`
	flex-direction: row;
	justify-content: space-between;
	gap: ${(props) => props.theme.spacing.md}px;
`;

const LoadingContainer = styled.View`
	align-items: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const LoadingText = styled.Text`
	margin-top: ${(props) => props.theme.spacing.sm}px;
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.secondary};
`;

export const UpdateDialog: React.FC = () => {
	const theme = useTheme();
	const { t } = useTranslation();
	const { updateInfo, isDownloading, isReloading, applyUpdate } = useUpdates();
	const [showDialog, setShowDialog] = React.useState(false);

	React.useEffect(() => {
		// Mostrar diálogo quando atualização estiver baixada
		if (updateInfo.isDownloaded && !isReloading) {
			setShowDialog(true);
		}
	}, [updateInfo.isDownloaded, isReloading]);

	const handleUpdate = async () => {
		setShowDialog(false);
		await applyUpdate();
	};

	const handleLater = () => {
		setShowDialog(false);
	};

	if (!showDialog) {
		return null;
	}

	return (
		<Modal visible={showDialog} transparent animationType="fade" onRequestClose={handleLater}>
			<ModalContainer>
				<DialogContainer>
					<Title>{t("updates.availableTitle") || "Atualização disponível"}</Title>
					<Message>
						{t("updates.availableMessage") ||
							"Uma nova versão do app está disponível. Deseja atualizar agora?"}
					</Message>
					{isDownloading && (
						<LoadingContainer>
							<ActivityIndicator size="small" color={theme.colors.button.primary} />
							<LoadingText>{t("updates.downloading") || "Baixando atualização..."}</LoadingText>
						</LoadingContainer>
					)}
					<ButtonContainer>
						<Button
							title={t("updates.later") || "Depois"}
							onPress={handleLater}
							variant="secondary"
							style={{ flex: 1 }}
						/>
						<Button
							title={t("updates.updateNow") || "Atualizar agora"}
							onPress={handleUpdate}
							variant="primary"
							style={{ flex: 1 }}
							loading={isReloading}
						/>
					</ButtonContainer>
				</DialogContainer>
			</ModalContainer>
		</Modal>
	);
};
