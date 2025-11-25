import React from "react";
import { Ionicons } from "@expo/vector-icons";
import styled, { useTheme } from "styled-components/native";

const StatusContainer = styled.View`
	margin-left: 4px;
	align-items: center;
	justify-content: center;
`;

interface MessageStatusProps {
	isRead: boolean;
	isViewed: boolean;
}

/**
 * Componente para exibir o status de uma mensagem (similar ao WhatsApp)
 * - Sem ícone: mensagem enviada mas não recebida
 * - Check simples: mensagem recebida (read: true)
 * - Check duplo cinza: mensagem lida mas não visualizada (read: true && viewedAt === null)
 * - Check duplo azul: mensagem visualizada (viewedAt !== null)
 */
export const MessageStatus: React.FC<MessageStatusProps> = ({ isRead, isViewed }) => {
	const theme = useTheme();

	// Se não foi lida, não mostra ícone
	if (!isRead) {
		return null;
	}

	// Se foi visualizada, mostra check duplo azul
	if (isViewed) {
		return (
			<StatusContainer>
				<Ionicons name="checkmark-done" size={16} color={theme.colors.button.primary} />
			</StatusContainer>
		);
	}

	// Se foi lida mas não visualizada, mostra check duplo cinza
	return (
		<StatusContainer>
			<Ionicons name="checkmark-done" size={16} color={theme.colors.text.tertiary} />
		</StatusContainer>
	);
};


