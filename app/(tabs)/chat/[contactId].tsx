import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	TextInput as RNTextInput,
	ActivityIndicator,
	Keyboard,
	View,
	FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled, { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useMessages } from "@/modules/chat/hooks/useMessages";
import { useAuth } from "@/modules/auth";
import { useTranslation } from "@/core/i18n";
import { mockContacts } from "@/modules/chat";
import { MessageStatus } from "@/shared/components/MessageStatus";
import type { CreateMessageData, Message } from "@/modules/chat/types";
import { setCurrentChatSenderId } from "@/services/notifications";

const ContainerWrapper = styled.View`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const Container = styled(KeyboardAvoidingView)`
	flex: 1;
	background-color: ${(props) => props.theme.colors.background.primary};
`;

const MessagesListContainer = styled.View`
	flex: 1;
	padding: ${(props) => props.theme.spacing.md}px;
`;

const MessageBubble = styled.View<{ isOwn: boolean }>`
	max-width: 75%;
	padding: ${(props) => props.theme.spacing.sm}px ${(props) => props.theme.spacing.md}px;
	margin-bottom: ${(props) => props.theme.spacing.sm}px;
	border-radius: ${(props) => props.theme.borderRadius.md}px;
	align-self: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
	background-color: ${(props) =>
		props.isOwn ? props.theme.colors.button.primary : props.theme.colors.background.card};
`;

const MessageText = styled.Text<{ isOwn: boolean }>`
	font-size: 16px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.primary : props.theme.colors.text.primary)};
	line-height: 20px;
`;

const MessageFooter = styled.View<{ isOwn: boolean }>`
	flex-direction: row;
	align-items: center;
	justify-content: ${(props) => (props.isOwn ? "flex-end" : "flex-start")};
	margin-top: 4px;
	gap: 4px;
`;

const MessageTime = styled.Text<{ isOwn: boolean }>`
	font-size: 11px;
	color: ${(props) => (props.isOwn ? props.theme.colors.text.secondary : props.theme.colors.text.tertiary)};
	opacity: 0.7;
`;

const InputContainer = styled.View<{ bottomInset: number; keyboardHeight: number }>`
	flex-direction: row;
	padding: ${(props) => props.theme.spacing.md}px;
	padding-bottom: ${(props) => {
		const basePadding = Math.max(props.theme.spacing.md, props.bottomInset);
		return basePadding;
	}}px;
	background-color: ${(props) => props.theme.colors.background.secondary};
	border-top-width: 1px;
	border-top-color: ${(props) => props.theme.colors.border.secondary};
	align-items: center;
	${(props) =>
		Platform.OS === "android" && props.keyboardHeight > 0
			? `
		position: absolute;
		bottom: ${props.keyboardHeight + 10}px;
		left: 0;
		right: 0;
	`
			: ""}
`;

const TextInput = styled.TextInput.attrs(() => ({
	placeholderTextColor: "#8a9ba8",
}))`
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
	const { t } = useTranslation();
	const { firebaseUser } = useAuth();
	const insets = useSafeAreaInsets();

	const { messages, isLoading, error, sendMessage, loadMoreMessages, hasMore, isLoadingMore, markAsViewed } =
		useMessages(contactId || "");

	// Esconder tab bar e marcar mensagens como visualizadas quando a tela de chat estiver em foco
	useFocusEffect(
		React.useCallback(() => {
			// Esconder tab bar
			navigation.getParent()?.setOptions({
				tabBarStyle: { display: "none" },
			});

			// Definir remetente atual para não mostrar notificação se estiver no chat
			if (contactId) {
				setCurrentChatSenderId(contactId);
			}

			// Marcar mensagens como visualizadas quando a tela recebe foco
			if (contactId) {
				setTimeout(() => {
					markAsViewed();
				}, 300);
			}

			// Mostrar tab bar e limpar remetente atual quando sair da tela
			return () => {
				setCurrentChatSenderId(null);
				navigation.getParent()?.setOptions({
					tabBarStyle: {
						backgroundColor: theme.colors.background.secondary,
						borderTopColor: theme.colors.border.secondary,
					},
				});
			};
		}, [navigation, theme, contactId, markAsViewed])
	);
	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const listRef = useRef<FlatList<Message> | null>(null);
	const inputRef = useRef<RNTextInput>(null);

	// Encontrar informações do contato
	const contact = mockContacts.find((c) => c.id === contactId);

	// Lista com mensagens mais recentes no topo (inverter ordem)
	// IMPORTANTE: Declarar ANTES dos useEffects que o usam
	const sortedMessages = useMemo(() => {
		if (!messages || !Array.isArray(messages)) {
			return [];
		}
		// Remover duplicatas por ID antes de ordenar
		const unique = messages.reduce((acc, msg) => {
			if (!acc.find((m) => m.id === msg.id)) {
				acc.push(msg);
			}
			return acc;
		}, [] as Message[]);
		// Ordenar por timestamp (mais antigas primeiro)
		unique.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		// Reverter para mostrar mais recentes no topo
		return unique.reverse();
	}, [messages]);

	// Rastrear última mensagem enviada para medir tempo de aparecimento
	const lastSentMessageRef = useRef<{ text: string; timestamp: number } | null>(null);
	const messageTimerRef = useRef<string | null>(null);

	// Detectar quando mensagem aparece na lista e finalizar timer
	useEffect(() => {
		if (!messages || messages.length === 0 || !messageTimerRef.current || !lastSentMessageRef.current) {
			return;
		}

		const lastSent = lastSentMessageRef.current;
		const currentTime = Date.now();
		const timeSinceSend = currentTime - lastSent.timestamp;

		// Buscar mensagem mais recente do usuário atual que corresponda ao texto enviado
		const matchingMessage = messages.find((m) => {
			const isOwnMessage = m.senderId === firebaseUser?.uid;
			const textMatches = m.text === lastSent.text || m.text.includes(lastSent.text.substring(0, 20));
			const isRecent = currentTime - m.timestamp.getTime() < 10000; // Últimos 10 segundos

			return isOwnMessage && textMatches && isRecent;
		});

		if (matchingMessage && messageTimerRef.current) {
			// Mensagem apareceu na lista - finalizar timer
			const duration = (currentTime - lastSent.timestamp) / 1000;
			console.timeEnd(messageTimerRef.current);
			console.log(`✅ Mensagem apareceu na timeline em ${duration.toFixed(3)} segundos`);
			messageTimerRef.current = null;
			lastSentMessageRef.current = null;
		}
	}, [messages, firebaseUser?.uid]);

	// Rolar para o topo (mensagem mais recente) quando a tela carregar ou novas mensagens chegarem
	useEffect(() => {
		if (sortedMessages && sortedMessages.length > 0 && !isLoading) {
			setTimeout(() => {
				try {
					listRef.current?.scrollToIndex({ index: 0, animated: false });
				} catch (err) {
					// Se scrollToIndex falhar, usar scrollToOffset como fallback
					console.warn("⚠️ Erro ao fazer scrollToIndex, usando scrollToOffset:", err);
					listRef.current?.scrollToOffset({ offset: 0, animated: false });
				}
			}, 200);
		}
	}, [sortedMessages.length, isLoading]);

	// Detectar altura do teclado para ajustar o layout
	useEffect(() => {
		const keyboardWillShowListener = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
				// Rolar para o topo (mensagem mais recente) quando o teclado abrir
				setTimeout(() => {
					if (sortedMessages && sortedMessages.length > 0) {
						try {
							listRef.current?.scrollToIndex({ index: 0, animated: true });
						} catch (err) {
							// Se scrollToIndex falhar, usar scrollToOffset como fallback
							console.warn("⚠️ Erro ao fazer scrollToIndex, usando scrollToOffset:", err);
							listRef.current?.scrollToOffset({ offset: 0, animated: true });
						}
					}
				}, 100);
			}
		);

		const keyboardWillHideListener = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setKeyboardHeight(0);
			}
		);

		return () => {
			keyboardWillShowListener.remove();
			keyboardWillHideListener.remove();
		};
	}, [sortedMessages.length]);

	// Formatar hora da mensagem
	const formatTime = useCallback((date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	}, []);

	// Renderizar item da lista
	const renderMessage = useCallback(
		({ item: message }: { item: Message }) => {
			// Validação de segurança para evitar crashes
			if (!message || !message.id || !message.text) {
				console.warn("⚠️ Tentativa de renderizar mensagem inválida:", message);
				return null;
			}

			// Validar timestamp
			if (!message.timestamp || !(message.timestamp instanceof Date)) {
				console.warn("⚠️ Timestamp inválido na mensagem:", message);
				return null;
			}

			const isOwn = message.senderId === firebaseUser?.uid;
			const isViewed = message.viewedAt !== null && message.viewedAt !== undefined;

			return (
				<MessageBubble isOwn={isOwn}>
					<MessageText isOwn={isOwn}>{message.text}</MessageText>
					<MessageFooter isOwn={isOwn}>
						<MessageTime isOwn={isOwn}>{formatTime(message.timestamp)}</MessageTime>
						{isOwn && <MessageStatus isRead={message.read} isViewed={isViewed} />}
					</MessageFooter>
				</MessageBubble>
			);
		},
		[firebaseUser?.uid, formatTime]
	);

	// Key extractor para FlatList
	// IMPORTANTE: sortedMessages já remove duplicatas, então podemos usar apenas o ID
	const keyExtractor = useCallback((item: Message) => {
		if (!item || !item.id) {
			// Fallback raro (não deveria acontecer se sortedMessages está correto)
			console.warn("⚠️ Mensagem sem ID no keyExtractor:", item);
			return `msg_${item?.timestamp?.getTime() || Date.now()}`;
		}
		return item.id;
	}, []);

	// getItemLayout para otimizar scroll (altura estimada de ~80px por mensagem)
	// Isso melhora significativamente a performance do scrollToIndex
	const getItemLayout = useCallback(
		(_data: ArrayLike<Message> | null | undefined, index: number) => ({
			length: 80, // altura estimada da mensagem
			offset: 80 * index,
			index,
		}),
		[]
	);

	// Carregar mais mensagens antigas ao fazer scroll para o final da lista
	const handleLoadMore = useCallback(() => {
		if (hasMore && !isLoadingMore && !isLoading) {
			loadMoreMessages();
		}
	}, [hasMore, isLoadingMore, isLoading, loadMoreMessages]);

	// Renderizar footer de loading
	const renderFooter = useCallback(() => {
		if (!isLoadingMore) return null;
		return (
			<LoadingContainer>
				<ActivityIndicator size="small" color={theme.colors.button.primary} />
			</LoadingContainer>
		);
	}, [isLoadingMore, theme]);

	// Enviar mensagem
	const handleSendMessage = async () => {
		if (!messageText.trim() || !contactId || isSending) {
			return;
		}

		const textToSend = messageText.trim();
		setIsSending(true);

		// Iniciar medição de tempo desde o clique até aparecer na lista
		const messageTimerLabel = `⏱️ Envio de mensagem: "${textToSend.substring(0, 30)}${
			textToSend.length > 30 ? "..." : ""
		}"`;
		console.time(messageTimerLabel);
		messageTimerRef.current = messageTimerLabel;

		// Armazenar informações da mensagem para rastrear quando aparecer na lista
		const sendStartTime = Date.now();
		lastSentMessageRef.current = {
			text: textToSend,
			timestamp: sendStartTime,
		};

		try {
			const messageData: CreateMessageData = {
				text: textToSend,
				receiverId: contactId,
			};

			// sendMessage agora retorna imediatamente (atualização otimista)
			// A mensagem já aparece na UI antes mesmo de criptografar
			sendMessage(messageData);
			setMessageText("");
			// Rolar para o topo após enviar mensagem
			setTimeout(() => {
				if (sortedMessages && sortedMessages.length > 0) {
					try {
						listRef.current?.scrollToIndex({ index: 0, animated: true });
					} catch (err) {
						// Se scrollToIndex falhar, usar scrollToOffset como fallback
						console.warn("⚠️ Erro ao fazer scrollToIndex, usando scrollToOffset:", err);
						listRef.current?.scrollToOffset({ offset: 0, animated: true });
					}
				}
			}, 100);
			inputRef.current?.blur();
		} catch (err: any) {
			console.error("Erro ao enviar mensagem:", err);
			// TODO: Mostrar erro para o usuário
		} finally {
			setIsSending(false);
		}
	};

	if (!contactId) {
		return (
			<Container>
				<EmptyContainer>
					<EmptyText>{t("chat.contactNotFound")}</EmptyText>
				</EmptyContainer>
			</Container>
		);
	}

	// Header será configurado no _layout.tsx

	// No Android, usar wrapper customizado; no iOS, usar KeyboardAvoidingView
	if (Platform.OS === "android") {
		return (
			<ContainerWrapper>
				<MessagesListContainer>
					{isLoading && (!sortedMessages || sortedMessages.length === 0) ? (
						<LoadingContainer>
							<ActivityIndicator size="large" color={theme.colors.button.primary} />
							<LoadingText>{t("chat.loadingMessages")}</LoadingText>
						</LoadingContainer>
					) : (
						<FlatList
							ref={listRef}
							data={sortedMessages || []}
							renderItem={renderMessage}
							keyExtractor={keyExtractor}
							onEndReached={handleLoadMore}
							onEndReachedThreshold={0.5}
							ListFooterComponent={renderFooter}
							contentContainerStyle={{
								paddingTop: insets.top > 0 ? insets.top : 0,
								paddingBottom: insets.bottom > 0 ? insets.bottom : 0,
								flexGrow: !sortedMessages || sortedMessages.length === 0 ? 1 : 0,
							}}
							keyboardShouldPersistTaps="handled"
							ListEmptyComponent={
								!isLoading ? (
									<EmptyContainer>
										<EmptyText>{t("chat.noMessages")}</EmptyText>
									</EmptyContainer>
								) : null
							}
							initialNumToRender={20}
							maxToRenderPerBatch={10}
							windowSize={10}
							maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
							removeClippedSubviews={true}
							getItemLayout={getItemLayout}
							inverted
						/>
					)}
				</MessagesListContainer>

				<InputContainer bottomInset={insets.bottom} keyboardHeight={keyboardHeight}>
					<TextInput
						ref={inputRef as any}
						value={messageText}
						onChangeText={setMessageText}
						placeholder={t("chat.messagePlaceholder")}
						multiline
						maxLength={1000}
						editable={!isSending}
						onFocus={() => {
							// Garantir que a lista role para o topo (mensagem mais recente) quando o input receber foco
							setTimeout(() => {
								if (sortedMessages && sortedMessages.length > 0) {
									try {
										listRef.current?.scrollToIndex({ index: 0, animated: true });
									} catch (err) {
										// Se scrollToIndex falhar, usar scrollToOffset como fallback
										console.warn("⚠️ Erro ao fazer scrollToIndex, usando scrollToOffset:", err);
										listRef.current?.scrollToOffset({ offset: 0, animated: true });
									}
								}
							}, 300);
						}}
					/>
					<SendButton
						onPress={handleSendMessage}
						disabled={!messageText.trim() || isSending}
						activeOpacity={0.7}
					>
						{isSending ? (
							<ActivityIndicator size="small" color={theme.colors.text.primary} />
						) : (
							<Ionicons name="send" size={20} color={theme.colors.text.primary} />
						)}
					</SendButton>
				</InputContainer>
			</ContainerWrapper>
		);
	}

	// iOS usa KeyboardAvoidingView
	return (
		<Container behavior="padding" keyboardVerticalOffset={insets.top + 100}>
			<MessagesListContainer>
				{isLoading && (!sortedMessages || sortedMessages.length === 0) ? (
					<LoadingContainer>
						<ActivityIndicator size="large" color={theme.colors.button.primary} />
						<LoadingText>{t("chat.loadingMessages")}</LoadingText>
					</LoadingContainer>
				) : (
					<FlatList
						ref={listRef}
						data={sortedMessages || []}
						renderItem={renderMessage}
						keyExtractor={keyExtractor}
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.5}
						ListFooterComponent={renderFooter}
						contentContainerStyle={{
							paddingTop: insets.top > 0 ? insets.top : 0,
							paddingBottom: insets.bottom > 0 ? insets.bottom : 0,
							flexGrow: !sortedMessages || sortedMessages.length === 0 ? 1 : 0,
						}}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							!isLoading ? (
								<EmptyContainer>
									<EmptyText>{t("chat.noMessages")}</EmptyText>
								</EmptyContainer>
							) : null
						}
						initialNumToRender={20}
						maxToRenderPerBatch={10}
						windowSize={10}
						maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
						removeClippedSubviews={true}
						getItemLayout={getItemLayout}
						inverted
					/>
				)}
			</MessagesListContainer>

			<InputContainer bottomInset={insets.bottom} keyboardHeight={0}>
				<TextInput
					ref={inputRef as any}
					value={messageText}
					onChangeText={setMessageText}
					placeholder={t("chat.messagePlaceholder")}
					multiline
					maxLength={1000}
					editable={!isSending}
					onFocus={() => {
						// Garantir que a lista role para o topo (mensagem mais recente) quando o input receber foco
						setTimeout(() => {
							if (sortedMessages.length > 0) {
								try {
									listRef.current?.scrollToIndex({ index: 0, animated: true });
								} catch (err) {
									// Se scrollToIndex falhar, usar scrollToOffset como fallback
									console.warn("⚠️ Erro ao fazer scrollToIndex, usando scrollToOffset:", err);
									listRef.current?.scrollToOffset({ offset: 0, animated: true });
								}
							}
						}, 300);
					}}
				/>
				<SendButton onPress={handleSendMessage} disabled={!messageText.trim() || isSending} activeOpacity={0.7}>
					{isSending ? (
						<ActivityIndicator size="small" color={theme.colors.text.primary} />
					) : (
						<Ionicons name="send" size={20} color={theme.colors.text.primary} />
					)}
				</SendButton>
			</InputContainer>
		</Container>
	);
}
