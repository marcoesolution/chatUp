import { useRouter } from "expo-router";
import { useLocation } from "@/modules/location";
import { useNearbyUsers } from "@/modules/location";
import { useContacts } from "@/modules/chat/hooks/useContacts";
import { useAuth } from "@/modules/auth";
import { preloadChatKey } from "@/core/security";
import type { Contact } from "@/modules/chat/types";

interface UseConversationsReturn {
	contacts: Contact[];
	isLoading: boolean;
	error: string | null;
	isLocationPermissionError: boolean;
	openSettings: () => Promise<void>;
	handleContactPress: (contactId: string) => void;
}

export function useConversations(): UseConversationsReturn {
	const router = useRouter();
	const { firebaseUser } = useAuth();

	// Hook de localização para acessar openSettings
	const { openSettings, permissionStatus } = useLocation();

	// Buscar usuários próximos
	const { nearbyUsers, isLoading: isLoadingNearby, error: nearbyError } = useNearbyUsers();

	// Buscar informações de chat para os usuários próximos
	const { contacts, isLoading: isLoadingContacts } = useContacts(nearbyUsers);

	const isLoading = isLoadingNearby || isLoadingContacts;

	// Verificar se o erro é relacionado a permissão de localização
	const isLocationPermissionError = Boolean(
		nearbyError &&
			(nearbyError.includes("localização") ||
				nearbyError.includes("permissão") ||
				nearbyError.includes("Localização") ||
				!permissionStatus?.granted)
	);

	const handleContactPress = (contactId: string) => {
		console.log("Navegando para chat do contato:", contactId);

		// Pré-carregar chave ANTES de navegar para o chat
		// Isso garante que a chave esteja pronta quando o usuário abrir o chat
		if (firebaseUser) {
			const generateChatId = (userId1: string, userId2: string) => {
				const sorted = [userId1, userId2].sort();
				return `${sorted[0]}_${sorted[1]}`;
			};
			const chatId = generateChatId(firebaseUser.uid, contactId);
			// Iniciar pré-carregamento imediatamente (não aguardar)
			preloadChatKey(chatId, firebaseUser.uid).catch(() => {
				// Ignorar erros - é apenas otimização
			});
		}

		// Tentar diferentes formatos de caminho
		const paths = [`/(tabs)/chat/${contactId}`, `./chat/${contactId}`, `chat/${contactId}`];

		// Tentar o primeiro caminho
		try {
			router.push(paths[0] as any);
		} catch (error) {
			console.error("Erro ao navegar com caminho 1:", error);
			// Tentar caminho alternativo
			router.push(paths[1] as any);
		}
	};

	return {
		contacts,
		isLoading,
		error: nearbyError,
		isLocationPermissionError,
		openSettings,
		handleContactPress,
	};
}
