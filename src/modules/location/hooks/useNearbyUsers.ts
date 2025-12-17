/**
 * Hook para buscar usuários próximos (raio de 2km)
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/modules/auth";
import { useLocation } from "./useLocation";
import {
	calculateLocationDistance,
	isWithinRadius,
	NEARBY_RADIUS_METERS,
} from "../utils/geolocation";
import api from "@/services/api";
import type { NearbyUser, Location } from "../types";
import type { UserProfile } from "@/modules/auth/types";

interface UseNearbyUsersReturn {
	nearbyUsers: NearbyUser[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook para buscar e monitorar usuários próximos em tempo real
 * Retorna apenas usuários dentro de um raio de 2km
 */
export function useNearbyUsers(): UseNearbyUsersReturn {
	const { firebaseUser, userProfile } = useAuth();
	const {
		location: userLocation,
		permissionStatus,
		isLoading: isLocationLoading,
		error: locationError,
	} = useLocation();
	const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Se ainda está carregando a localização, aguardar
		if (isLocationLoading) {
			setIsLoading(true);
			setError(null);
			return;
		}

		// Verificar condições básicas
		if (!firebaseUser) {
            setError("Usuário não autenticado");
			setIsLoading(false);
			setNearbyUsers([]);
			return;
		}

		// Se não tem permissão, aguardar um pouco antes de mostrar erro
		// Pode ser que a permissão ainda esteja sendo verificada
		if (!permissionStatus?.granted) {
			console.log("⚠️ useNearbyUsers: permissionStatus não está granted. Status:", permissionStatus);
			console.log("⚠️ useNearbyUsers: Aguardando verificação de permissão...");

			// Aguardar um pouco e verificar novamente
			const checkAgain = setTimeout(() => {
				// Verificar novamente se ainda não tem permissão
				if (!permissionStatus?.granted) {
					console.log("❌ useNearbyUsers: Permissão realmente negada após verificação");
					setError("Permissão de localização negada");
					setIsLoading(false);
					setNearbyUsers([]);
				} else {
					console.log("✅ useNearbyUsers: Permissão concedida após aguardar!");
				}
			}, 2000); // Aguardar 2 segundos antes de mostrar erro

			setIsLoading(true);
			setError(null);

			return () => {
				clearTimeout(checkAgain);
			};
		}

		// Se tem erro de localização, usar esse erro
		if (locationError) {
			setError(locationError);
			setIsLoading(false);
			setNearbyUsers([]);
			return;
		}

		// Se não tem localização ainda (mas não está carregando e não tem erro)
		// Se a permissão está concedida, aguardar a localização ser obtida
		// O hook useLocation deve eventualmente obter a localização ou definir um erro
		if (!userLocation) {
			setIsLoading(true);
			setError(null);
			return;
		}

		setError(null);
		setIsLoading(true);

		try {
            // 1. Atualizar localização do usuário atual no backend
            // não esperar para buscar, mas enviar update
            api.put('/location', {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
            }).catch(e => console.warn("Erro ao atualizar localização", e));

            // 2. Buscar usuários próximos
            api.get('/location/nearby', {
                params: {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    radius: NEARBY_RADIUS_METERS / 1000 // Convert to KM
                }
            }).then(response => {
                const users = response.data;
                setNearbyUsers(users);
                setIsLoading(false);
                setError(null);
            }).catch(e => {
                console.error("Erro ao buscar usuários próximos API", e);
                setError("Erro ao buscar usuários próximos");
                setIsLoading(false);
            });

            // Polling simples a cada 30s se quiser atualização
            const interval = setInterval(() => {
                 api.get('/location/nearby', {
                    params: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        radius: NEARBY_RADIUS_METERS / 1000
                    }
                }).then(res => setNearbyUsers(res.data))
                  .catch(e => console.warn("Polling nearby error", e));
            }, 30000);

			return () => {
				clearInterval(interval);
			};
		} catch (err: any) {
			console.error("❌ Erro ao configurar query de usuários próximos:", err);
			setError(err.message || "Erro ao buscar usuários próximos");
			setIsLoading(false);
		}
	}, [
		firebaseUser?.uid,
		userLocation?.latitude,
		userLocation?.longitude,
		permissionStatus?.granted,
		permissionStatus?.status, // Adicionar status para detectar mudanças na permissão
		isLocationLoading,
		locationError,
	]);

	return {
		nearbyUsers,
		isLoading,
		error,
	};
}
