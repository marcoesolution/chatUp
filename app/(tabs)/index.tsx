import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import styled, { useTheme } from 'styled-components/native';
import { mockContacts } from '@/modules/chat';
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

	return (
		<ContactItem onPress={onPress} activeOpacity={0.7}>
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

	const handleContactPress = (contactId: string) => {
		// TODO: Navegar para a tela de chat do contato
		console.log('Contact pressed:', contactId);
	};

	const renderContact = ({ item }: { item: Contact }) => (
		<ContactListItem
			contact={item}
			onPress={() => handleContactPress(item.id)}
		/>
	);

	return (
		<Container>
			<FlatList
				data={mockContacts}
				renderItem={renderContact}
				keyExtractor={(item) => item.id}
				contentContainerStyle={
					mockContacts.length === 0 ? { flex: 1 } : undefined
				}
				ListEmptyComponent={
					<EmptyContainer>
						<EmptyText>Nenhum contato disponível</EmptyText>
					</EmptyContainer>
				}
			/>
		</Container>
	);
}
