import { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import { Platform, Alert } from "react-native";
import { useTranslation } from "@/core/i18n";

export interface UpdateInfo {
	isAvailable: boolean;
	isDownloaded: boolean;
	manifest?: Updates.Manifest;
}

/**
 * Hook para gerenciar atualizações OTA do Expo
 */
export function useUpdates() {
	const { t } = useTranslation();
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
		isAvailable: false,
		isDownloaded: false,
	});
	const [isChecking, setIsChecking] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isReloading, setIsReloading] = useState(false);

	/**
	 * Verificar se há atualizações disponíveis
	 */
	const checkForUpdates = async () => {
		// Em desenvolvimento, não verificar updates
		if (__DEV__ || !Updates.isEnabled) {
			console.log("ℹ️ Updates desabilitados em modo desenvolvimento");
			return;
		}

		setIsChecking(true);
		try {
			const update = await Updates.checkForUpdateAsync();
			setUpdateInfo({
				isAvailable: update.isAvailable,
				isDownloaded: false,
				manifest: update.manifest,
			});

			if (update.isAvailable) {
				console.log("✅ Atualização disponível!");
				// Baixar automaticamente
				await downloadUpdate();
			} else {
				console.log("ℹ️ App está atualizado");
			}
		} catch (error: any) {
			console.error("❌ Erro ao verificar atualizações:", error);
		} finally {
			setIsChecking(false);
		}
	};

	/**
	 * Baixar atualização disponível
	 */
	const downloadUpdate = async () => {
		if (!updateInfo.isAvailable || isDownloading) {
			return;
		}

		setIsDownloading(true);
		try {
			const result = await Updates.fetchUpdateAsync();
			setUpdateInfo({
				isAvailable: true,
				isDownloaded: result.isNew,
				manifest: result.manifest,
			});

			if (result.isNew) {
				console.log("✅ Atualização baixada com sucesso!");
				// Mostrar diálogo para aplicar atualização
				showUpdateDialog();
			}
		} catch (error: any) {
			console.error("❌ Erro ao baixar atualização:", error);
			Alert.alert(
				t("updates.downloadErrorTitle") || "Erro ao baixar atualização",
				error.message || t("updates.downloadErrorMessage") || "Não foi possível baixar a atualização. Tente novamente mais tarde."
			);
		} finally {
			setIsDownloading(false);
		}
	};

	/**
	 * Mostrar diálogo para aplicar atualização
	 */
	const showUpdateDialog = () => {
		Alert.alert(
			t("updates.availableTitle") || "Atualização disponível",
			t("updates.availableMessage") || "Uma nova versão do app está disponível. Deseja atualizar agora?",
			[
				{
					text: t("updates.later") || "Depois",
					style: "cancel",
				},
				{
					text: t("updates.updateNow") || "Atualizar agora",
					onPress: applyUpdate,
				},
			]
		);
	};

	/**
	 * Aplicar atualização baixada
	 */
	const applyUpdate = async () => {
		if (!updateInfo.isDownloaded || isReloading) {
			return;
		}

		setIsReloading(true);
		try {
			await Updates.reloadAsync();
		} catch (error: any) {
			console.error("❌ Erro ao aplicar atualização:", error);
			Alert.alert(
				t("updates.reloadErrorTitle") || "Erro ao atualizar",
				error.message || t("updates.reloadErrorMessage") || "Não foi possível aplicar a atualização. O app será reiniciado."
			);
			// Tentar recarregar mesmo assim
			await Updates.reloadAsync();
		}
	};

	/**
	 * Verificar atualizações automaticamente ao carregar o app
	 */
	useEffect(() => {
		// Verificar apenas em produção
		if (!__DEV__ && Updates.isEnabled) {
			checkForUpdates();
		}
	}, []);

	return {
		updateInfo,
		isChecking,
		isDownloading,
		isReloading,
		checkForUpdates,
		downloadUpdate,
		applyUpdate,
	};
}

