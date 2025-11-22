/**
 * Hook para gerenciar atualizações obrigatórias do app via EAS Update
 */

import { useState, useEffect, useCallback } from "react";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { isDevMode } from "@/shared/utils";

interface UseAppUpdateReturn {
	isUpdateAvailable: boolean;
	isUpdateRequired: boolean;
	isChecking: boolean;
	isDownloading: boolean;
	error: string | null;
	updateMessage: string | null;
	checkForUpdates: () => Promise<{ isAvailable: boolean; message?: string } | null>;
	downloadAndReload: () => Promise<void>;
}

/**
 * Hook para verificar e gerenciar atualizações obrigatórias
 * Bloqueia o app se houver uma atualização obrigatória disponível
 */
export function useAppUpdate(): UseAppUpdateReturn {
	const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
	const [isUpdateRequired, setIsUpdateRequired] = useState(false);
	// Em dev mode, começar com false para não bloquear o app
	const [isChecking, setIsChecking] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [updateMessage, setUpdateMessage] = useState<string | null>(null);

	/**
	 * Verifica se há atualizações disponíveis
	 */
	const checkForUpdates = useCallback(async (): Promise<{ isAvailable: boolean; message?: string } | null> => {
		// Em desenvolvimento, não verificar atualizações
		if (isDevMode()) {
			setIsChecking(false);
			setIsUpdateAvailable(false);
			setIsUpdateRequired(false);
			return null;
		}

		try {
			setIsChecking(true);
			setError(null);
			setUpdateMessage(null);

			// Log informações de debug
			console.log("🔍 Verificando atualizações...");
			console.log("Updates enabled:", Updates.isEnabled);
			console.log("Update ID:", Updates.updateId);
			console.log("Channel:", Updates.channel);
			console.log("Runtime Version:", Updates.runtimeVersion);
			console.log("Manifest:", Updates.manifest);

			// Verificar atualizações disponíveis
			const update = await Updates.checkForUpdateAsync();

			console.log("📦 Resultado da verificação:", {
				isAvailable: update.isAvailable,
				manifest: update.manifest,
			});

			if (update.isAvailable) {
				setIsUpdateAvailable(true);
				// Para atualizações forçadas, consideramos TODAS as atualizações como obrigatórias
				// Isso garante que o usuário sempre tenha a versão mais recente
				setIsUpdateRequired(true);

				// Mensagem padrão da atualização
				const message = "Uma nova versão do aplicativo está disponível com melhorias e correções.";
				setUpdateMessage(message);

				console.log("✅ Atualização disponível encontrada!");
				return { isAvailable: true, message };
			} else {
				console.log("ℹ️ Nenhuma atualização disponível");
				setIsUpdateAvailable(false);
				setIsUpdateRequired(false);
				setUpdateMessage(null);
				return { isAvailable: false };
			}
		} catch (err: any) {
			console.error("Erro ao verificar atualizações:", err);
			setError(err.message || "Erro ao verificar atualizações");
			// Em caso de erro, não bloquear o app
			setIsUpdateRequired(false);
			setUpdateMessage(null);
			return null;
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

			console.log("⬇️ Baixando atualização...");

			// Baixar a atualização
			const result = await Updates.fetchUpdateAsync();

			console.log("✅ Resultado do download:", {
				isNew: result.isNew,
				manifest: result.manifest,
			});

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
	 * Verificação automática DESABILITADA
	 * Atualizações devem ser verificadas manualmente via checkForUpdates()
	 */
	useEffect(() => {
		// Sempre começar com isChecking = false
		// Verificações devem ser feitas manualmente
		setIsChecking(false);
	}, []);

	return {
		isUpdateAvailable,
		isUpdateRequired,
		isChecking,
		isDownloading,
		error,
		updateMessage,
		checkForUpdates,
		downloadAndReload,
	};
}
