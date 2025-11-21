/**
 * Hook para gerenciar atualizações obrigatórias do app via EAS Update
 */

import { useState, useEffect, useCallback } from "react";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

interface UseAppUpdateReturn {
	isUpdateAvailable: boolean;
	isUpdateRequired: boolean;
	isChecking: boolean;
	isDownloading: boolean;
	error: string | null;
	checkForUpdates: () => Promise<void>;
	downloadAndReload: () => Promise<void>;
}

/**
 * Hook para verificar e gerenciar atualizações obrigatórias
 * Bloqueia o app se houver uma atualização obrigatória disponível
 */
export function useAppUpdate(): UseAppUpdateReturn {
	const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
	const [isUpdateRequired, setIsUpdateRequired] = useState(false);
	const [isChecking, setIsChecking] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Verifica se há atualizações disponíveis
	 */
	const checkForUpdates = useCallback(async () => {
		// Em desenvolvimento, não verificar atualizações
		if (__DEV__ || !Updates.isEnabled) {
			setIsChecking(false);
			return;
		}

		try {
			setIsChecking(true);
			setError(null);

			// Verificar atualizações disponíveis
			const update = await Updates.checkForUpdateAsync();

			if (update.isAvailable) {
				setIsUpdateAvailable(true);
				// Para atualizações forçadas, consideramos TODAS as atualizações como obrigatórias
				// Isso garante que o usuário sempre tenha a versão mais recente
				setIsUpdateRequired(true);
			} else {
				setIsUpdateAvailable(false);
				setIsUpdateRequired(false);
			}
		} catch (err: any) {
			console.error("Erro ao verificar atualizações:", err);
			setError(err.message || "Erro ao verificar atualizações");
			// Em caso de erro, não bloquear o app
			setIsUpdateRequired(false);
		} finally {
			setIsChecking(false);
		}
	}, []);

	/**
	 * Baixa e aplica a atualização disponível
	 */
	const downloadAndReload = useCallback(async () => {
		if (!isUpdateAvailable || !Updates.isEnabled) {
			return;
		}

		try {
			setIsDownloading(true);
			setError(null);

			// Baixar a atualização
			const result = await Updates.fetchUpdateAsync();

			if (result.isNew) {
				// Recarregar o app para aplicar a atualização
				await Updates.reloadAsync();
			} else {
				// Não há nova atualização, apenas recarregar
				await Updates.reloadAsync();
			}
		} catch (err: any) {
			console.error("Erro ao baixar atualização:", err);
			setError(err.message || "Erro ao baixar atualização. Tente novamente.");
			setIsDownloading(false);
		}
	}, [isUpdateAvailable]);

	/**
	 * Verificar atualizações quando o app inicia
	 */
	useEffect(() => {
		checkForUpdates();
	}, [checkForUpdates]);

	return {
		isUpdateAvailable,
		isUpdateRequired,
		isChecking,
		isDownloading,
		error,
		checkForUpdates,
		downloadAndReload,
	};
}

