/**
 * Hook para gerenciar localização do usuário
 */

import { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus, Linking, Platform, Alert } from "react-native";
import * as Location from "expo-location";
import type { Location as LocationType, LocationPermissionStatus } from "../types";

interface UseLocationReturn {
	location: LocationType | null;
	isLoading: boolean;
	error: string | null;
	permissionStatus: LocationPermissionStatus | null;
	requestPermission: () => Promise<boolean>;
	updateLocation: () => Promise<void>;
	openSettings: () => Promise<void>;
}

/**
 * Hook para gerenciar permissões e atualização de localização do usuário
 * Atualiza a localização quando o app está ativo
 */
export function useLocation(): UseLocationReturn {
	const [location, setLocation] = useState<LocationType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);

	/**
	 * Solicita permissão de localização
	 */
	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

			const permission: LocationPermissionStatus = {
				granted: status === "granted",
				canAskAgain,
				status: status as "granted" | "denied" | "undetermined",
			};

			setPermissionStatus(permission);

			if (status !== "granted") {
				setError("Permissão de localização negada. O app precisa da localização para funcionar.");
				return false;
			}

			setError(null);
			return true;
		} catch (err: any) {
			const errorMessage = err.message || "Erro ao solicitar permissão de localização";
			setError(errorMessage);
			return false;
		}
	}, []);

	/**
	 * Verifica o status atual da permissão
	 */
	const checkPermission = useCallback(async () => {
		try {
			const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

			const permission: LocationPermissionStatus = {
				granted: status === "granted",
				canAskAgain,
				status: status as "granted" | "denied" | "undetermined",
			};

			setPermissionStatus(permission);
			return status === "granted";
		} catch (err: any) {
			console.error("Erro ao verificar permissão:", err);
			return false;
		}
	}, []);

	/**
	 * Atualiza a localização atual do usuário
	 */
	const updateLocation = useCallback(async () => {
		try {
			const hasPermission = await checkPermission();

			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) {
					setIsLoading(false);
					return;
				}
			}

			setIsLoading(true);
			setError(null);

			// Verificar se os serviços de localização estão habilitados
			const isEnabled = await Location.hasServicesEnabledAsync();
			if (!isEnabled) {
				throw new Error("Serviços de localização estão desabilitados. Por favor, habilite o GPS.");
			}

			// Obter localização atual com alta precisão
			const locationResult = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced, // Balanceado entre precisão e bateria
			});

			const newLocation: LocationType = {
				latitude: locationResult.coords.latitude,
				longitude: locationResult.coords.longitude,
				updatedAt: new Date(),
			};

			setLocation(newLocation);
			setError(null);
		} catch (err: any) {
			const errorMessage = err.message || "Erro ao obter localização. Verifique se o GPS está habilitado.";
			setError(errorMessage);
			console.error("Erro ao atualizar localização:", err);
		} finally {
			setIsLoading(false);
		}
	}, [checkPermission, requestPermission]);

	/**
	 * Efeito para verificar permissão e obter localização inicial
	 */
	useEffect(() => {
		checkPermission().then((hasPermission) => {
			if (hasPermission) {
				updateLocation();
			} else {
				setIsLoading(false);
			}
		});
	}, []);

	/**
	 * Efeito para atualizar localização quando o app entra em foreground
	 */
	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
			if (nextAppState === "active" && permissionStatus?.granted) {
				// App entrou em foreground, atualizar localização
				updateLocation();
			}
		});

		return () => {
			subscription.remove();
		};
	}, [permissionStatus, updateLocation]);

	/**
	 * Efeito para atualizar localização periodicamente enquanto o app está ativo
	 */
	useEffect(() => {
		if (!permissionStatus?.granted) {
			return;
		}

		// Atualizar localização a cada 30 segundos quando app está ativo
		const interval = setInterval(() => {
			if (AppState.currentState === "active") {
				updateLocation();
			}
		}, 30000); // 30 segundos

		return () => {
			clearInterval(interval);
		};
	}, [permissionStatus, updateLocation]);

	/**
	 * Abre as configurações do app para o usuário habilitar a permissão de localização
	 */
	const openSettings = useCallback(async (): Promise<void> => {
		try {
			if (Platform.OS === "android") {
				// Abrir configurações do app no Android
				await Linking.openSettings();
			} else {
				// iOS
				await Linking.openURL("app-settings:");
			}
		} catch (err: any) {
			console.error("Erro ao abrir configurações:", err);
			Alert.alert(
				"Erro",
				"Não foi possível abrir as configurações. Por favor, vá em Configurações > Apps > chatUp > Permissões e habilite a localização."
			);
		}
	}, []);

	return {
		location,
		isLoading,
		error,
		permissionStatus,
		requestPermission,
		updateLocation,
		openSettings,
	};
}
