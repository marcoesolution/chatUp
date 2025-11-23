import React from "react";
import { FlatList, ActivityIndicator } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { useConversations } from "./hooks";
import type { Contact } from "@/modules/chat/types";
import {
	Container,
	ContactItem,
	AvatarContainer,
	AvatarText,
	ContactInfo,
	ContactDetails,
	ContactName,
	LastMessage,
	UnreadBadge,
	UnreadCount,
	EmptyContainer,
	EmptyText,
	ErrorText,
	ErrorIcon,
	ErrorButtonContainer,
	LoadingContainer,
} from "./styles";

interface ContactListItemProps {
	contact: Contact;
	onPress: () => void;
}

function ContactListItem({ contact, onPress }: ContactListItemProps) {
	const initials = contact.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const handlePress = () => {
		console.log("ContactListItem: onPress chamado para contato:", contact.id);
		onPress();
	};

	return (
		<ContactItem onPress={handlePress} activeOpacity={0.7}>
			<AvatarContainer>
				<AvatarText>{initials}</AvatarText>
			</AvatarContainer>
			<ContactInfo>
				<ContactDetails>
					<ContactName>{contact.name}</ContactName>
					{contact.lastMessage && <LastMessage numberOfLines={1}>{contact.lastMessage}</LastMessage>}
				</ContactDetails>
				{contact.unreadCount > 0 && (
					<UnreadBadge>
						<UnreadCount>{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</UnreadCount>
					</UnreadBadge>
				)}
			</ContactInfo>
		</ContactItem>
	);
}

export default function ConversationsScreen() {
	const theme = useTheme();
	const {
		contacts,
		isLoading,
		error: nearbyError,
		isLocationPermissionError,
		openSettings,
		handleContactPress,
	} = useConversations();

	const renderContact = ({ item }: { item: Contact }) => (
		<ContactListItem contact={item} onPress={() => handleContactPress(item.id)} />
	);

	// Mostrar loading
	if (isLoading) {
		return (
			<Container>
				<LoadingContainer>
					<ActivityIndicator size="large" color={theme.colors.button.primary} />
					<EmptyText style={{ marginTop: theme.spacing.md }}>Buscando usuários próximos...</EmptyText>
				</LoadingContainer>
			</Container>
		);
	}

	// Mostrar erro
	if (nearbyError) {
		return (
			<Container>
				<EmptyContainer>
					{isLocationPermissionError && (
						<ErrorIcon>
							<Ionicons name="location-outline" size={64} color={theme.colors.status.error} />
						</ErrorIcon>
					)}
					<ErrorText>{nearbyError}</ErrorText>
					<EmptyText>
						{isLocationPermissionError
							? "Para ver usuários próximos, é necessário permitir o acesso à localização."
							: "Verifique se a localização está habilitada e tente novamente."}
					</EmptyText>
					{isLocationPermissionError && (
						<ErrorButtonContainer>
							<Button title="Abrir Configurações" onPress={openSettings} variant="primary" />
						</ErrorButtonContainer>
					)}
				</EmptyContainer>
			</Container>
		);
	}

	return (
		<Container>
			<FlatList
				data={contacts}
				renderItem={renderContact}
				keyExtractor={(item) => item.id}
				contentContainerStyle={contacts.length === 0 ? { flex: 1 } : undefined}
				ListEmptyComponent={
					<EmptyContainer>
						<EmptyText>Nenhum usuário próximo encontrado</EmptyText>
						<EmptyText style={{ marginTop: theme.spacing.sm, fontSize: 14 }}>
							Usuários dentro de 2km aparecerão aqui automaticamente
						</EmptyText>
					</EmptyContainer>
				}
			/>
		</Container>
	);
}
