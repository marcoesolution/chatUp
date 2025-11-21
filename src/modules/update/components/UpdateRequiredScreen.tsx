/**
 * Tela de atualização obrigatória
 * Bloqueia o acesso ao app até que a atualização seja instalada
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";

interface UpdateRequiredScreenProps {
	onUpdate: () => void;
	isDownloading?: boolean;
	error?: string | null;
}

const Container = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	background-color: ${(props) => props.theme.colors.background.primary};
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const IconContainer = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.xl}px;
`;

const Title = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize["2xl"]}px;
	font-weight: ${(props) => props.theme.typography.fontWeight.bold};
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.text.primary};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const Message = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.base}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
	line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const ErrorText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.primary};
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
	margin-top: ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ButtonContainer = styled.View`
	width: 100%;
	max-width: 300px;
	margin-top: ${(props) => props.theme.spacing.lg}px;
`;

const LoadingContainer = styled.View`
	flex-direction: row;
	align-items: center;
	justify-content: center;
	margin-top: ${(props) => props.theme.spacing.md}px;
`;

const LoadingText = styled.Text`
	font-size: ${(props) => props.theme.typography.fontSize.sm}px;
	font-family: ${(props) => props.theme.typography.fontFamily.secondary};
	color: ${(props) => props.theme.colors.text.secondary};
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

export const UpdateRequiredScreen: React.FC<UpdateRequiredScreenProps> = ({
	onUpdate,
	isDownloading = false,
	error = null,
}) => {
	const theme = useTheme();

	return (
		<Container>
			<IconContainer>
				<Ionicons name="cloud-download-outline" size={80} color={theme.colors.button.primary} />
			</IconContainer>

			<Title>Atualização Obrigatória</Title>

			<Message>
				Uma nova versão do aplicativo está disponível e é necessária para continuar usando o app.
				Por favor, atualize agora para acessar todas as funcionalidades.
			</Message>

			{error && <ErrorText>{error}</ErrorText>}

			<ButtonContainer>
				<Button
					title={isDownloading ? "Baixando atualização..." : "Atualizar Agora"}
					onPress={onUpdate}
					variant="primary"
					loading={isDownloading}
					disabled={isDownloading}
				/>
			</ButtonContainer>

			{isDownloading && (
				<LoadingContainer>
					<ActivityIndicator size="small" color={theme.colors.button.primary} />
					<LoadingText>Aguarde, isso pode levar alguns instantes...</LoadingText>
				</LoadingContainer>
			)}
		</Container>
	);
};

