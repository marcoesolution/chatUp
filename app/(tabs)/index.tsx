import React, { useCallback, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, TextInput } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { useTranslation } from "@/core/i18n";
import { useConversations } from "./_hooks";
import api from "@/services/api";
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
	SearchBarContainer,
	SearchInput,
} from "./_styles";

interface ContactListItemProps {
	contact: {
		id: string;
		name: string;
		avatar?: string;
		unreadCount?: number;
	};
	onPress: () => void;
}

function ContactListItem({ contact, onPress }: ContactListItemProps) {
	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "??";

	return (
		<ContactItem onPress={onPress} activeOpacity={0.7}>
			<AvatarContainer>
				<AvatarText>{initials}</AvatarText>
			</AvatarContainer>
			<ContactInfo>
				<ContactDetails>
					<ContactName>{contact.name}</ContactName>
				</ContactDetails>
				{contact.unreadCount && contact.unreadCount > 0 ? (
					<UnreadBadge>
						<UnreadCount>{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</UnreadCount>
					</UnreadBadge>
				) : null}
			</ContactInfo>
		</ContactItem>
	);
}

// Componente que consome a promise de pesquisa usando o hook 'use' (React 19)
function SearchResultsList({ 
	promise, 
	renderItem, 
	keyExtractor,
	t,
	theme
}: { 
	promise: Promise<any[]>, 
	renderItem: any, 
	keyExtractor: any,
	t: any,
	theme: any
}) {
	// O hook 'use' suspende o componente até que a promise seja resolvida
	const results = React.use(promise);

	return (
		<FlatList
			data={results}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			contentContainerStyle={results.length === 0 ? { flex: 1 } : undefined}
			ListEmptyComponent={
				<EmptyContainer>
					<EmptyText>{t("conversations.noResultsFound") || "Nenhum usuário encontrado"}</EmptyText>
				</EmptyContainer>
			}
		/>
	);
}

export default function ConversationsScreen() {
	const theme = useTheme();
	const { t } = useTranslation();
	const {
		contacts,
		isLoading: isLoadingNearby,
		error: nearbyError,
		isLocationPermissionError,
		openSettings,
		handleContactPress,
	} = useConversations();

	const [searchQuery, setSearchQuery] = useState("");
	// State para armazenar a promise da pesquisa (padrão React 19)
	const [searchPromise, setSearchPromise] = useState<Promise<any[]> | null>(null);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery.length >= 2) {
				// Criamos a promise para ser consumida pelo hook 'use'
				const promise = api.get(`/users/search`, {
					params: { q: searchQuery }
				}).then(res => res.data);
				
				setSearchPromise(promise);
			} else {
				setSearchPromise(null);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const renderContact = useCallback(
		({ item }: { item: any }) => (
			<ContactListItem 
				contact={{
					id: item.id,
					name: item.displayName || item.name,
					avatar: item.photoURL || item.avatar,
					unreadCount: item.unreadCount
				}} 
				onPress={() => handleContactPress(item.id)} 
			/>
		),
		[handleContactPress]
	);

	const keyExtractor = useCallback((item: any) => item.id, []);

	const isSearchingMode = searchQuery.length >= 2;

	return (
		<Container>
			<SearchBarContainer>
				<Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
				<SearchInput
					placeholder={t("conversations.searchPlaceholder") || "Buscar usuários..."}
					placeholderTextColor={theme.colors.text.tertiary}
					value={searchQuery}
					onChangeText={setSearchQuery}
					autoCapitalize="none"
				/>
				{searchQuery.length > 0 && (
					<Ionicons 
						name="close-circle" 
						size={20} 
						color={theme.colors.text.tertiary} 
						onPress={() => setSearchQuery("")}
					/>
				)}
			</SearchBarContainer>

			{isSearchingMode && searchPromise ? (
				// NOVO: Usando Suspense para lidar com o carregamento da promise de pesquisa
				<React.Suspense fallback={
					<LoadingContainer>
						<ActivityIndicator size="small" color={theme.colors.button.primary} />
						<EmptyText style={{ marginTop: theme.spacing.sm }}>{t("conversations.searching")}</EmptyText>
					</LoadingContainer>
				}>
					<SearchResultsList 
						promise={searchPromise} 
						renderItem={renderContact} 
						keyExtractor={keyExtractor}
						t={t}
						theme={theme}
					/>
				</React.Suspense>
			) : (
				<>
					{isLoadingNearby ? (
						<LoadingContainer>
							<ActivityIndicator size="large" color={theme.colors.button.primary} />
							<EmptyText style={{ marginTop: theme.spacing.md }}>{t("conversations.searching")}</EmptyText>
						</LoadingContainer>
					) : (
						<FlatList
							data={contacts}
							renderItem={renderContact}
							keyExtractor={keyExtractor}
							contentContainerStyle={contacts.length === 0 ? { flex: 1 } : undefined}
							ListEmptyComponent={
								<EmptyContainer>
									{nearbyError ? (
										<>
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
										</>
									) : (
										<>
											<EmptyText>{t("conversations.noUsersFound")}</EmptyText>
											<EmptyText style={{ marginTop: theme.spacing.sm, fontSize: 14 }}>
												{t("conversations.usersWithin2km")}
											</EmptyText>
										</>
									)}
								</EmptyContainer>
							}
						/>
					)}
				</>
			)}
		</Container>
	);
}
