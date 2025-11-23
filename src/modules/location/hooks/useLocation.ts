/**
 * Hook para gerenciar localização do usuário
 */

import { useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus, Linking, Platform, Alert, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import type { Location as LocationType, LocationPermissionStatus } from "../types";

// Mock de localização para desenvolvimento
// Só funciona quando __DEV__ === true (modo desenvolvimento)
// Em produção, o comportamento normal será mantido
const MOCK_LOCATION: LocationType = {
	latitude: -17.803677,
	longitude: -50.920879,
	updatedAt: new Date(),
};

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
			console.log("🔍 useLocation: Solicitando permissão de localização...");

			let status: string = "undetermined";
			let canAskAgain: boolean = true;

			// No Android, tentar também via PermissionsAndroid
			if (Platform.OS === "android") {
				try {
					const androidResult = await PermissionsAndroid.request(
						PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
						{
							title: "Permissão de Localização",
							message: "Este app precisa da sua localização para mostrar usuários próximos a você.",
							buttonNeutral: "Perguntar depois",
							buttonNegative: "Cancelar",
							buttonPositive: "OK",
						}
					);

					console.log("🔍 useLocation: PermissionsAndroid retornou:", androidResult);

					if (androidResult === PermissionsAndroid.RESULTS.GRANTED) {
						status = "granted";
						canAskAgain = false;
					} else if (androidResult === PermissionsAndroid.RESULTS.DENIED) {
						status = "denied";
					}
				} catch (androidErr) {
					console.warn("⚠️ useLocation: Erro ao solicitar via PermissionsAndroid:", androidErr);
				}
			}

			// Tentar também via expo-location
			try {
				const expoPermission = await Location.requestForegroundPermissionsAsync();
				console.log("🔍 useLocation: Expo-location retornou:", expoPermission);

				// Se expo-location retornar granted, usar esse resultado
				if (expoPermission.status === "granted") {
					status = "granted";
					canAskAgain = expoPermission.canAskAgain;
				} else if (status === "undetermined") {
					// Se ainda não temos um status, usar o do expo-location
					status = expoPermission.status;
					canAskAgain = expoPermission.canAskAgain;
				}
			} catch (expoErr) {
				console.warn("⚠️ useLocation: Erro ao solicitar via expo-location:", expoErr);
			}

			const permission: LocationPermissionStatus = {
				granted: status === "granted",
				canAskAgain,
				status: status as "granted" | "denied" | "undetermined",
			};

			setPermissionStatus(permission);

			if (status !== "granted") {
				console.log("❌ useLocation: Permissão não concedida. Status:", status);
				setError("Permissão de localização negada. O app precisa da localização para funcionar.");
				return false;
			}

			console.log("✅ useLocation: Permissão concedida!");
			setError(null);
			return true;
		} catch (err: any) {
			console.error("❌ useLocation: Erro ao solicitar permissão:", err);
			const errorMessage = err.message || "Erro ao solicitar permissão de localização";
			setError(errorMessage);
			return false;
		}
	}, []);

	/**
	 * Verifica o status atual da permissão usando múltiplas fontes
	 * Em modo dev (__DEV__), retorna granted automaticamente para permitir uso do mock
	 */
	const checkPermission = useCallback(async () => {
		// Em modo desenvolvimento, retornar granted automaticamente para permitir mock
		if (__DEV__) {
			console.log("🔧 useLocation: Modo DEV ativo - usando mock de localização");
			const permission: LocationPermissionStatus = {
				granted: true,
				canAskAgain: false,
				status: "granted",
			};
			setPermissionStatus(permission);
			return true;
		}

		try {
			console.log("🔍 useLocation: Verificando permissão de localização...");

			// Tentar verificar via expo-location primeiro
			let status: string = "undetermined";
			let canAskAgain: boolean = true;

			try {
				const expoPermission = await Location.getForegroundPermissionsAsync();
				status = expoPermission.status;
				canAskAgain = expoPermission.canAskAgain;
				console.log("🔍 useLocation: Expo-location retornou:", { status, canAskAgain });
			} catch (expoErr) {
				console.warn("⚠️ useLocation: Erro ao verificar via expo-location:", expoErr);
			}

			// No Android, SEMPRE verificar também via PermissionsAndroid
			// O expo-location às vezes não detecta corretamente permissões já concedidas
			if (Platform.OS === "android") {
				try {
					const androidFine = await PermissionsAndroid.check(
						PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
					);
					const androidCoarse = await PermissionsAndroid.check(
						PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
					);
					console.log("🔍 useLocation: PermissionsAndroid retornou:", {
						fine: androidFine,
						coarse: androidCoarse,
						expoStatus: status,
					});

					// Se PermissionsAndroid diz que tem permissão, confiar nele
					// Isso resolve o problema do expo-location não detectar permissões já concedidas
					if (androidFine || androidCoarse) {
						if (status !== "granted") {
							console.log(
								"✅ useLocation: PermissionsAndroid detectou permissão, mas expo-location retornou:",
								status
							);
							console.log("✅ useLocation: Usando resultado do PermissionsAndroid (permissão concedida)");
						}
						status = "granted";
						canAskAgain = false;
					} else if (status === "granted") {
						// Se expo-location diz granted mas Android não, confiar no expo-location
						console.log("✅ useLocation: Expo-location detectou permissão");
					}
				} catch (androidErr) {
					console.warn("⚠️ useLocation: Erro ao verificar via PermissionsAndroid:", androidErr);
					// Se der erro, confiar no resultado do expo-location
				}
			}

			console.log("🔍 useLocation: Status final da permissão:", { status, canAskAgain });

			const permission: LocationPermissionStatus = {
				granted: status === "granted",
				canAskAgain,
				status: status as "granted" | "denied" | "undetermined",
			};

			setPermissionStatus(permission);

			if (status === "granted") {
				console.log("✅ useLocation: Permissão concedida");
			} else {
				console.log("⚠️ useLocation: Permissão não concedida. Status:", status);
			}

			return status === "granted";
		} catch (err: any) {
			console.error("❌ useLocation: Erro ao verificar permissão:", err);
			return false;
		}
	}, []);

	/**
	 * Atualiza a localização atual do usuário
	 * Em modo dev (__DEV__), retorna coordenadas mockadas imediatamente
	 */
	const updateLocation = useCallback(async () => {
		// Em modo desenvolvimento, usar mock de localização
		if (__DEV__) {
			console.log("🔧 useLocation: Modo DEV - usando coordenadas mockadas", {
				latitude: MOCK_LOCATION.latitude,
				longitude: MOCK_LOCATION.longitude,
			});
			setIsLoading(true);
			setError(null);

			// Simular delay mínimo para parecer realista
			await new Promise((resolve) => setTimeout(resolve, 100));

			const mockLocation: LocationType = {
				...MOCK_LOCATION,
				updatedAt: new Date(),
			};

			setLocation(mockLocation);
			setError(null);
			setIsLoading(false);
			console.log("✅ useLocation: Mock de localização aplicado com sucesso");
			return;
		}

		// Comportamento normal em produção
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
		let mounted = true;

		const initLocation = async () => {
			console.log("🔍 useLocation: Inicializando verificação de permissão...");
			const hasPermission = await checkPermission();

			if (!mounted) return;

			if (hasPermission) {
				console.log("✅ useLocation: Permissão encontrada, obtendo localização...");
				await updateLocation();
			} else {
				console.log("⚠️ useLocation: Permissão não encontrada, aguardando...");
				setIsLoading(false);
			}
		};

		initLocation();

		return () => {
			mounted = false;
		};
	}, []);

	/**
	 * Efeito para obter localização automaticamente quando a permissão é concedida
	 */
	useEffect(() => {
		if (permissionStatus?.granted && !location && !isLoading && !error) {
			// Permissão foi concedida mas ainda não temos localização, tentar obter
			updateLocation();
		}
	}, [permissionStatus?.granted, location, isLoading, error, updateLocation]);

	/**
	 * Efeito para atualizar localização quando o app entra em foreground
	 */
	useEffect(() => {
		const subscription = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				console.log("🔍 useLocation: App entrou em foreground, verificando permissão novamente...");
				// Verificar permissão novamente quando app volta ao foreground
				// Isso garante que se o usuário concedeu permissão nas configurações, será detectado
				const hasPermission = await checkPermission();

				if (hasPermission) {
					console.log("✅ useLocation: Permissão confirmada, atualizando localização...");
					await updateLocation();
				} else {
					console.log("⚠️ useLocation: Permissão ainda não concedida");
				}
			}
		});

		return () => {
			subscription.remove();
		};
	}, [checkPermission, updateLocation]);

	/**
	 * Efeito para verificar permissão periodicamente e atualizar localização
	 */
	useEffect(() => {
		// Verificar permissão periodicamente (a cada 5 segundos) quando app está ativo
		// Isso garante que se o usuário conceder permissão nas configurações, será detectado
		const checkInterval = setInterval(async () => {
			if (AppState.currentState === "active") {
				const hasPermission = await checkPermission();
				if (hasPermission && !permissionStatus?.granted) {
					console.log("✅ useLocation: Permissão detectada após verificação periódica!");
					// Permissão foi concedida, atualizar localização
					await updateLocation();
				}
			}
		}, 5000); // Verificar a cada 5 segundos

		// Atualizar localização a cada 30 segundos quando app está ativo e tem permissão
		const locationInterval = setInterval(() => {
			if (AppState.currentState === "active" && permissionStatus?.granted) {
				updateLocation();
			}
		}, 30000); // 30 segundos

		return () => {
			clearInterval(checkInterval);
			clearInterval(locationInterval);
		};
	}, [permissionStatus, checkPermission, updateLocation]);

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
