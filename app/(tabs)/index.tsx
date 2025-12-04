import React, { useCallback } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
import { useConversations } from "./_hooks";
import type { Contact } from "@/modules/chat/types";
import {
	Container,
	ContactItem,
	AvatarContainer,
	AvatarText,
	ContactInfo,
	ContactDetails,
	ContactName,
	UnreadBadge,
	UnreadCount,
	EmptyContainer,
	EmptyText,
	ErrorText,
	ErrorIcon,
	ErrorButtonContainer,
	LoadingContainer,
} from "./_styles";

interface ContactListItemProps {
	contact: Contact;
	onPress: () => void;
}

function ContactListItem({ contact, onPress }: ContactListItemProps) {
	// Proteção contra crash se contact.name for null/undefined
	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "??";

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
	const { t } = useTranslation();
	const {
		contacts,
		isLoading,
		error: nearbyError,
		isLocationPermissionError,
		openSettings,
		handleContactPress,
	} = useConversations();

	const renderContact = useCallback(
		({ item }: { item: Contact }) => <ContactListItem contact={item} onPress={() => handleContactPress(item.id)} />,
		[handleContactPress]
	);

	const keyExtractor = useCallback((item: Contact) => item.id, []);

	// Mostrar loading
	if (isLoading) {
		return (
			<Container>
				<LoadingContainer>
					<ActivityIndicator size="large" color={theme.colors.button.primary} />
					<EmptyText style={{ marginTop: theme.spacing.md }}>{t("conversations.searching")}</EmptyText>
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
							? t("conversations.locationPermissionError")
							: t("conversations.locationError")}
					</EmptyText>
					{isLocationPermissionError && (
						<ErrorButtonContainer>
							<Button title={t("conversations.openSettings")} onPress={openSettings} variant="primary" />
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
				keyExtractor={keyExtractor}
				contentContainerStyle={contacts.length === 0 ? { flex: 1 } : undefined}
				ListEmptyComponent={
					<EmptyContainer>
						<EmptyText>{t("conversations.noUsersFound")}</EmptyText>
						<EmptyText style={{ marginTop: theme.spacing.sm, fontSize: 14 }}>
							{t("conversations.usersWithin2km")}
						</EmptyText>
					</EmptyContainer>
				}
			/>
		</Container>
	);
}
