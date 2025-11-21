import React from 'react';
import { FlatList, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useNearbyUsers } from '@/modules/location';
import { useLocation } from '@/modules/location';
import { useContacts } from '@/modules/chat/hooks/useContacts';
import { Button } from '@/shared/components';
import type { Contact } from '@/modules/chat/types';

const Container = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const ContactItem = styled.TouchableOpacity`
	flex-direction: row;
	align-items: center;
	padding: ${(props) => props.theme.spacing.md}px ${(props) => props.theme.spacing.lg}px;
	border-bottom-width: 1px;
	border-bottom-color: ${(props) => props.theme.colors.border.secondary};
	background-color: ${(props) => props.theme.colors.background.secondary};
`;

const AvatarContainer = styled.View`
	width: 56px;
	height: 56px;
	border-radius: 28px;
	background-color: ${(props) => props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	margin-right: ${(props) => props.theme.spacing.md}px;
`;

const AvatarText = styled.Text`
	font-size: 24px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const ContactInfo = styled.View`
	flex: 1;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
`;

const ContactDetails = styled.View`
	flex: 1;
`;

const ContactName = styled.Text`
	font-size: 16px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
	margin-bottom: 4px;
`;

const LastMessage = styled.Text`
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

const UnreadBadge = styled.View`
	min-width: 24px;
	height: 24px;
	border-radius: 12px;
	background-color: ${(props) => props.theme.colors.status.info};
	justify-content: center;
	align-items: center;
	padding-horizontal: 8px;
	margin-left: ${(props) => props.theme.spacing.sm}px;
`;

const UnreadCount = styled.Text`
	font-size: 12px;
	font-weight: 600;
	color: ${(props) => props.theme.colors.text.primary};
`;

const EmptyContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const EmptyText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.text.tertiary};
	text-align: center;
`;

const ErrorText = styled.Text`
	font-size: 16px;
	color: ${(props) => props.theme.colors.status.error};
	text-align: center;
	margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const ErrorContainer = styled.View`
	align-items: center;
	justify-content: center;
	padding: ${(props) => props.theme.spacing.xl}px;
`;

const ErrorIcon = styled.View`
	margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ErrorButtonContainer = styled.View`
	margin-top: ${(props) => props.theme.spacing.lg}px;
	width: 100%;
	max-width: 300px;
`;

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;

const DistanceText = styled.Text`
	font-size: 12px;
	color: ${(props) => props.theme.colors.text.tertiary};
	margin-top: 2px;
`;

interface ContactListItemProps {
	contact: Contact;
	onPress: () => void;
}

function ContactListItem({ contact, onPress }: ContactListItemProps) {
	const theme = useTheme();
	const initials = contact.name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

	const handlePress = () => {
		console.log('ContactListItem: onPress chamado para contato:', contact.id);
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
					{contact.lastMessage && (
						<LastMessage numberOfLines={1}>{contact.lastMessage}</LastMessage>
					)}
				</ContactDetails>
				{contact.unreadCount > 0 && (
					<UnreadBadge>
						<UnreadCount>
							{contact.unreadCount > 99 ? '99+' : contact.unreadCount}
						</UnreadCount>
					</UnreadBadge>
				)}
			</ContactInfo>
		</ContactItem>
	);
}

export default function ConversationsScreen() {
	const router = useRouter();
	const theme = useTheme();
	
	// Hook de localização para acessar openSettings
	const { openSettings, permissionStatus } = useLocation();
	
	// Buscar usuários próximos
	const { nearbyUsers, isLoading: isLoadingNearby, error: nearbyError } = useNearbyUsers();
	
	// Buscar informações de chat para os usuários próximos
	const { contacts, isLoading: isLoadingContacts } = useContacts(nearbyUsers);
	
	const isLoading = isLoadingNearby || isLoadingContacts;
	
	// Verificar se o erro é relacionado a permissão de localização
	const isLocationPermissionError = 
		nearbyError && 
		(nearbyError.includes('localização') || 
		 nearbyError.includes('permissão') || 
		 nearbyError.includes('Localização') ||
		 !permissionStatus?.granted);

	const handleContactPress = (contactId: string) => {
		console.log('Navegando para chat do contato:', contactId);
		// Tentar diferentes formatos de caminho
		const paths = [
			`/(tabs)/chat/${contactId}`,
			`./chat/${contactId}`,
			`chat/${contactId}`,
		];
		
		// Tentar o primeiro caminho
		try {
			router.push(paths[0] as any);
		} catch (error) {
			console.error('Erro ao navegar com caminho 1:', error);
			// Tentar caminho alternativo
			router.push(paths[1] as any);
		}
	};

	const renderContact = ({ item }: { item: Contact }) => (
		<ContactListItem
			contact={item}
			onPress={() => handleContactPress(item.id)}
		/>
	);

	// Mostrar loading
	if (isLoading) {
		return (
			<Container>
				<LoadingContainer>
					<ActivityIndicator size="large" color={theme.colors.button.primary} />
					<EmptyText style={{ marginTop: theme.spacing.md }}>
						Buscando usuários próximos...
					</EmptyText>
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
							<Ionicons 
								name="location-outline" 
								size={64} 
								color={theme.colors.status.error} 
							/>
						</ErrorIcon>
					)}
					<ErrorText>{nearbyError}</ErrorText>
					<EmptyText>
						{isLocationPermissionError 
							? 'Para ver usuários próximos, é necessário permitir o acesso à localização.'
							: 'Verifique se a localização está habilitada e tente novamente.'}
					</EmptyText>
					{isLocationPermissionError && (
						<ErrorButtonContainer>
							<Button
								title="Abrir Configurações"
								onPress={openSettings}
								variant="primary"
							/>
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
				contentContainerStyle={
					contacts.length === 0 ? { flex: 1 } : undefined
				}
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
