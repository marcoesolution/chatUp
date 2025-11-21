import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Hook customizado para forçar refetch quando a tela recebe foco
 * Útil para garantir que os dados sejam atualizados ao navegar entre telas
 */
export function useRefreshOnFocus<T>(refetch: () => void | Promise<unknown>) {
	const enabledRef = useRef(false);

	useFocusEffect(
		useCallback(() => {
			if (enabledRef.current) {
				refetch();
			} else {
				enabledRef.current = true;
			}
		}, [refetch])
	);
}
