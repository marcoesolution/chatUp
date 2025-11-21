import React, { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput as RNTextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Send } from 'lucide-react-native';
import { useMessages } from '@/modules/chat/hooks/useMessages';
import { useAuth } from '@/modules/auth';
import { mockContacts } from '@/modules/chat';
import type { CreateMessageData } from '@/modules/chat/types';

const Container = styled(KeyboardAvoidingView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const MessagesContainer = styled(ScrollView)`
	flex: 1;
	padding: ${(props) => props.theme.spacing.md}px;
`;

const MessageBubble = styled.View<{ isOwn: boolean }>`
	max-width: 75%;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	align-self: ${(props) => (props.isOwn ? 'flex-end' : 'flex-start')};
	background-color: ${(props) =>
		props.isOwn ? props.theme.colors.button.primary : props.theme.colors.background.card};
`;

const MessageText = styled.Text<{ isOwn: boolean }>`
	font-size: 16px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.primary : props.theme.colors.text.primary)};
	line-height: 20px;
`;

const MessageTime = styled.Text<{ isOwn: boolean }>`
	font-size: 11px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.secondary : props.theme.colors.text.tertiary)};
	margin-top: 4px;
	opacity: 0.7;
`;

const InputContainer = styled.View<{ bottomInset: number }>`
	flex-direction: row;
	padding: ${(props) => props.theme.spacing.md}px;
	padding-bottom: ${(props) => Math.max(props.theme.spacing.md, props.bottomInset)}px;
	background-color: ${(props) => props.theme.colors.background.secondary};
	border-top-width: 1px;
	border-top-color: ${(props) => props.theme.colors.border.secondary};
	align-items: center;
`;

const TextInput = styled.TextInput`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.input};
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	color: ${(props) => props.theme.colors.text.primary};
	font-size: 16px;
	max-height: 100px;
	margin-right: ${(props) => props.theme.spacing.sm}px;
`;

const SendButton = styled.TouchableOpacity<{ disabled: boolean }>`
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background-color: ${(props) =>
		props.disabled ? props.theme.colors.button.disabled : props.theme.colors.button.primary};
	justify-content: center;
	align-items: center;
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
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

const LoadingContainer = styled.View`
	flex: 1;
	justify-content: center;
	align-items: center;
`;

const LoadingText = styled.Text`
	margin-top: ${(props) => props.theme.spacing.md}px;
	font-size: 14px;
	color: ${(props) => props.theme.colors.text.secondary};
`;

export default function ChatScreen() {
	const router = useRouter();
	const navigation = useNavigation();
	const { contactId } = useLocalSearchParams<{ contactId: string }>();
	const theme = useTheme();
	const { firebaseUser } = useAuth();
	const insets = useSafeAreaInsets();
	
	// Esconder tab bar quando a tela de chat estiver em foco
	useFocusEffect(
		React.useCallback(() => {
			// Esconder tab bar
			navigation.getParent()?.setOptions({
				tabBarStyle: { display: 'none' },
			});

			// Mostrar tab bar quando sair da tela
			return () => {
				navigation.getParent()?.setOptions({
					tabBarStyle: {
						backgroundColor: theme.colors.background.secondary,
						borderTopColor: theme.colors.border.secondary,
					},
				});
			};
		}, [navigation, theme])
	);

	const { messages, isLoading, error, sendMessage } = useMessages(contactId || '');
	const [messageText, setMessageText] = useState('');
	const [isSending, setIsSending] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const inputRef = useRef<RNTextInput>(null);

	// Encontrar informações do contato
	const contact = mockContacts.find((c) => c.id === contactId);

	// Rolar para o final quando novas mensagens chegarem
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages.length]);

	// Formatar hora da mensagem
	const formatTime = (date: Date) => {
		return new Intl.DateTimeFormat('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	};

	// Enviar mensagem
	const handleSendMessage = async () => {
		if (!messageText.trim() || !contactId || isSending) return;

		setIsSending(true);
		try {
			const messageData: CreateMessageData = {
				text: messageText.trim(),
				receiverId: contactId,
			};

			await sendMessage(messageData);
			setMessageText('');
			inputRef.current?.blur();
		} catch (err: any) {
			console.error('Erro ao enviar mensagem:', err);
			// TODO: Mostrar erro para o usuário
		} finally {
			setIsSending(false);
		}
	};

	if (!contactId) {
		return (
			<Container>
				<EmptyContainer>
					<EmptyText>Contato não encontrado</EmptyText>
				</EmptyContainer>
			</Container>
		);
	}

	if (isLoading) {
		return (
			<Container>
				<LoadingContainer>
					<LoadingText>Carregando mensagens...</LoadingText>
				</LoadingContainer>
			</Container>
		);
	}

	// Header será configurado no _layout.tsx

	return (
		<Container
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
		>
			<MessagesContainer
				ref={scrollViewRef}
				contentContainerStyle={{ 
					flexGrow: 1,
					paddingBottom: insets.bottom > 0 ? insets.bottom : 0,
				}}
				keyboardShouldPersistTaps="handled"
			>
				{messages.length === 0 ? (
					<EmptyContainer>
						<EmptyText>Nenhuma mensagem ainda.{'\n'}Comece a conversar!</EmptyText>
					</EmptyContainer>
				) : (
					messages.map((message) => {
						const isOwn = message.senderId === firebaseUser?.uid;
						return (
							<MessageBubble key={message.id} isOwn={isOwn}>
								<MessageText isOwn={isOwn}>{message.text}</MessageText>
								<MessageTime isOwn={isOwn}>{formatTime(message.timestamp)}</MessageTime>
							</MessageBubble>
						);
					})
				)}
			</MessagesContainer>

			<InputContainer bottomInset={insets.bottom}>
				<TextInput
					ref={inputRef}
					value={messageText}
					onChangeText={setMessageText}
					placeholder="Digite uma mensagem..."
					placeholderTextColor={theme.colors.text.tertiary}
					multiline
					maxLength={1000}
					editable={!isSending}
				/>
				<SendButton
					onPress={handleSendMessage}
					disabled={!messageText.trim() || isSending}
					activeOpacity={0.7}
				>
					<Send size={20} color={theme.colors.text.primary} />
				</SendButton>
			</InputContainer>
		</Container>
	);
}

