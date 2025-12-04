import * as Notifications from "expo-notifications";
import { Platform, AppState, AppStateStatus } from "react-native";
import { db } from "@/core/firebase";
import { getDoc, doc } from "firebase/firestore";
import type { UserProfile } from "@/modules/auth/types";
import type { Message } from "@/modules/chat/types";

/**
 * Configuração de notificações
 */
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

/**
 * Interface para mensagens pendentes de notificação
 */
interface PendingNotification {
	senderId: string;
	senderName: string;
	count: number;
}

/**
 * Cache de nomes de usuários para evitar múltiplas consultas
 */
const userNameCache = new Map<string, string>();

/**
 * Rastreamento de mensagens pendentes por remetente
 */
const pendingNotifications = new Map<string, PendingNotification>();

/**
 * ID do remetente do chat atual (para não mostrar notificação se estiver no chat)
 */
let currentChatSenderId: string | null = null;

/**
 * Timeout para agrupar mensagens
 */
let notificationTimeout: NodeJS.Timeout | null = null;

/**
 * Extrai o primeiro nome de um nome completo
 */
function getFirstName(fullName: string): string {
	if (!fullName) return "Usuário";
	const parts = fullName.trim().split(/\s+/);
	return parts[0] || "Usuário";
}

/**
 * Obtém o nome do usuário do Firestore (com cache)
 */
async function getUserName(userId: string): Promise<string> {
	// Verificar cache primeiro
	if (userNameCache.has(userId)) {
		return userNameCache.get(userId)!;
	}

	if (!db) {
		console.warn("⚠️ Firestore não inicializado, usando nome padrão");
		return "Usuário";
	}

	try {
		const userDoc = await getDoc(doc(db, "users", userId));
		if (userDoc.exists()) {
			const userData = userDoc.data() as UserProfile;
			const displayName = userData.displayName || "Usuário";
			const firstName = getFirstName(displayName);
			// Armazenar no cache
			userNameCache.set(userId, firstName);
			return firstName;
		}
	} catch (error) {
		console.error("❌ Erro ao buscar nome do usuário:", error);
	}

	// Fallback
	const fallbackName = "Usuário";
	userNameCache.set(userId, fallbackName);
	return fallbackName;
}

/**
 * Limpa o cache de nomes de usuários
 */
export function clearUserNameCache(): void {
	userNameCache.clear();
}

/**
 * Define o remetente do chat atual (para não mostrar notificação se estiver no chat)
 */
export function setCurrentChatSenderId(senderId: string | null): void {
	currentChatSenderId = senderId;
}

/**
 * Verifica se o app está em foreground
 */
function isAppInForeground(): boolean {
	return AppState.currentState === "active";
}

/**
 * Agenda uma notificação acumulativa
 */
async function scheduleAccumulativeNotification(): Promise<void> {
	if (pendingNotifications.size === 0) {
		console.log("🔔 [Notificação] Nenhuma notificação pendente");
		return;
	}

	const appState = AppState.currentState;
	const inForeground = isAppInForeground();

	console.log("🔔 [Notificação] Agendando notificação", {
		appState,
		inForeground,
		pendingCount: pendingNotifications.size,
		currentChatSenderId,
	});

	// Não bloquear notificações por estar em foreground
	// handleNewMessage já verifica se está no chat do remetente
	// Mostrar notificação mesmo em foreground (útil quando app está aberto mas não no chat)

	// Agrupar todas as notificações pendentes
	const notifications: PendingNotification[] = Array.from(pendingNotifications.values());

	// Limpar pendências
	pendingNotifications.clear();

	// Se há apenas um remetente, mostrar notificação simples
	if (notifications.length === 1) {
		const notification = notifications[0];
		console.log("🔔 [Notificação] Mostrando notificação única", {
			senderName: notification.senderName,
			count: notification.count,
		});
		await showNotification(notification.senderName, notification.count);
	} else {
		// Múltiplos remetentes - mostrar notificação geral
		const totalMessages = notifications.reduce((sum, n) => sum + n.count, 0);
		console.log("🔔 [Notificação] Mostrando notificação múltipla", {
			totalMessages,
			contactCount: notifications.length,
		});
		await showNotification("Várias pessoas", totalMessages, notifications.length);
	}
}

/**
 * Mostra uma notificação
 */
async function showNotification(senderName: string, messageCount: number, contactCount?: number): Promise<void> {
	try {
		// Verificar permissões antes de mostrar
		const { status } = await Notifications.getPermissionsAsync();
		console.log("🔔 [Notificação] Status de permissão:", status);

		if (status !== "granted") {
			console.warn("⚠️ [Notificação] Permissão não concedida:", status);
			// Tentar solicitar novamente
			const { status: newStatus } = await Notifications.requestPermissionsAsync();
			if (newStatus !== "granted") {
				console.error("❌ [Notificação] Permissão negada - não é possível mostrar notificação");
				return;
			}
		}

		// Formatar texto da notificação
		let body: string;
		if (contactCount && contactCount > 1) {
			// Múltiplos contatos
			body = `${messageCount} mensagens de ${contactCount} pessoas`;
		} else {
			// Um único remetente
			body = `${messageCount} ${messageCount === 1 ? "mensagem" : "mensagens"} de ${senderName}`;
		}

		console.log("🔔 [Notificação] Criando notificação:", { body, senderName, messageCount, contactCount });

		// Configurar notificação para Android (agrupamento acumulativo)
		const notificationConfig: Notifications.NotificationRequestInput = {
			content: {
				title: "ChatUp",
				body,
				sound: true,
				priority: Notifications.AndroidNotificationPriority.HIGH,
				data: {
					senderId: contactCount ? undefined : senderName, // Para múltiplos, não definir senderId
				},
			},
			trigger: null, // Mostrar imediatamente
		};

		// Configuração específica para Android (agrupamento acumulativo)
		if (Platform.OS === "android") {
			notificationConfig.content.android = {
				channelId: "messages",
				priority: Notifications.AndroidNotificationPriority.HIGH,
				// Usar o mesmo groupId para agrupar notificações do mesmo remetente
				// O Android automaticamente acumula notificações com o mesmo groupId
				groupId: contactCount ? "multiple" : senderName,
				// Não usar groupSummary para permitir agrupamento automático do Android
			};
		}

		const notificationId = await Notifications.scheduleNotificationAsync(notificationConfig);
		console.log("✅ [Notificação] Notificação enviada com sucesso:", {
			id: notificationId,
			body,
			platform: Platform.OS,
		});
	} catch (error) {
		console.error("❌ [Notificação] Erro ao mostrar notificação:", error);
		console.error("❌ [Notificação] Detalhes do erro:", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}

/**
 * Processa uma nova mensagem e agenda notificação se necessário
 */
export async function handleNewMessage(message: Message, currentUserId: string): Promise<void> {
	console.log("🔔 [Notificação] handleNewMessage chamado", {
		senderId: message.senderId,
		currentUserId,
		currentChatSenderId,
		appState: AppState.currentState,
	});

	// Ignorar mensagens próprias
	if (message.senderId === currentUserId) {
		console.log("🔔 [Notificação] Mensagem própria ignorada");
		return;
	}

	// Ignorar se estiver no chat do remetente
	if (currentChatSenderId === message.senderId) {
		console.log("🔔 [Notificação] No chat do remetente - notificação ignorada");
		return;
	}

	// Verificar se app está em foreground apenas para logging
	const appInForeground = isAppInForeground();
	console.log("🔔 [Notificação] Processando notificação", {
		appInForeground,
		appState: AppState.currentState,
		senderId: message.senderId,
	});

	// Obter nome do remetente
	const senderName = await getUserName(message.senderId);
	console.log("🔔 [Notificação] Nome do remetente obtido:", senderName);

	// Adicionar ou atualizar notificação pendente
	const existing = pendingNotifications.get(message.senderId);
	if (existing) {
		existing.count += 1;
	} else {
		pendingNotifications.set(message.senderId, {
			senderId: message.senderId,
			senderName,
			count: 1,
		});
	}

	// Cancelar timeout anterior se existir
	if (notificationTimeout) {
		clearTimeout(notificationTimeout);
	}

	// Agendar notificação após 1 segundo (para agrupar mensagens rápidas)
	console.log("🔔 [Notificação] Agendando notificação em 1 segundo");
	notificationTimeout = setTimeout(() => {
		console.log("🔔 [Notificação] Timeout executado - chamando scheduleAccumulativeNotification");
		scheduleAccumulativeNotification();
		notificationTimeout = null;
	}, 1000);
}

/**
 * Solicita permissões de notificação
 */
export async function requestNotificationPermissions(): Promise<boolean> {
	try {
		const { status: existingStatus } = await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		if (finalStatus !== "granted") {
			console.warn("⚠️ Permissão de notificação não concedida");
			return false;
		}

		// Configurar canal de notificação para Android
		if (Platform.OS === "android") {
			try {
				await Notifications.setNotificationChannelAsync("messages", {
					name: "Mensagens",
					description: "Notificações de mensagens recebidas",
					importance: Notifications.AndroidImportance.HIGH,
					sound: true,
					vibrationPattern: [0, 250, 250, 250],
					lightColor: "#FF231F7C",
				});
				console.log("✅ [Notificação] Canal de notificação 'messages' criado no Android");
			} catch (channelError) {
				console.warn("⚠️ [Notificação] Erro ao criar canal (pode já existir):", channelError);
			}
		}

		console.log("✅ [Notificação] Permissões de notificação concedidas");
		return true;
	} catch (error) {
		console.error("❌ Erro ao solicitar permissões de notificação:", error);
		return false;
	}
}

/**
 * Limpa todas as notificações pendentes
 */
export function clearPendingNotifications(): void {
	pendingNotifications.clear();
	if (notificationTimeout) {
		clearTimeout(notificationTimeout);
		notificationTimeout = null;
	}
}

/**
 * Cancela todas as notificações
 */
export async function cancelAllNotifications(): Promise<void> {
	try {
		await Notifications.cancelAllScheduledNotificationsAsync();
		await Notifications.dismissAllNotificationsAsync();
		clearPendingNotifications();
	} catch (error) {
		console.error("❌ Erro ao cancelar notificações:", error);
	}
}
