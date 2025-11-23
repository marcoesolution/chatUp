import { useRouter } from "expo-router";
import { useLocation } from "@/modules/location";
import { useNearbyUsers } from "@/modules/location";
import { useContacts } from "@/modules/chat/hooks/useContacts";
import type { Contact } from "@/modules/chat/types";

interface UseConversationsReturn {
	contacts: Contact[];
	isLoading: boolean;
	error: string | null;
	isLocationPermissionError: boolean;
	openSettings: () => Promise<void>;
	handleContactPress: (contactId: string) => void;
}

/**
 * Hook customizado para gerenciar a lógica de negócio da tela de conversas
 * Encapsula a busca de usuários próximos, contatos e navegação
 */
export function useConversations(): UseConversationsReturn {
	const router = useRouter();

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
