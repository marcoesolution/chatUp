/**
 * Hook para buscar usuários próximos (raio de 2km)
 */

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/core/firebase";
import { useAuth } from "@/modules/auth";
import { useLocation } from "./useLocation";
import {
	calculateLocationDistance,
	isWithinRadius,
	NEARBY_RADIUS_METERS,
	calculateBoundingBox,
} from "../utils/geolocation";
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
		if (!firebaseUser || !db) {
			if (!firebaseUser) {
				setError("Usuário não autenticado");
			}
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
			// Firestore não suporta queries geográficas nativas nem múltiplas condições de range
			// Vamos buscar todos os usuários com localização habilitada e filtrar no cliente
			// Para melhor performance, podemos limitar a busca inicial
			const usersQuery = query(collection(db, "users"), where("isLocationEnabled", "==", true));

			// Escutar mudanças em tempo real
			const unsubscribe = onSnapshot(
				usersQuery,
				(snapshot: QuerySnapshot<DocumentData>) => {
					const currentUserId = firebaseUser.uid;
					const nearby: NearbyUser[] = [];

					snapshot.forEach((docSnapshot) => {
						const userData = docSnapshot.data() as UserProfile & {
							location?: Location;
						};

						// Pular o próprio usuário
						if (docSnapshot.id === currentUserId) {
							return;
						}

						// Verificar se o usuário tem localização válida
						if (!userData.location || !userData.location.latitude || !userData.location.longitude) {
							return;
						}

						// Verificar se está dentro do raio de 2km usando cálculo exato
						if (isWithinRadius(userLocation, userData.location, NEARBY_RADIUS_METERS)) {
							// Calcular distância exata
							const distance = calculateLocationDistance(userLocation, userData.location);

							nearby.push({
								id: docSnapshot.id,
								name: userData.displayName || "Usuário",
								avatar: userData.photoURL,
								location: userData.location,
								distance: Math.round(distance), // Arredondar para metros
							});
						}
					});

					// Ordenar por distância (mais próximos primeiro)
					nearby.sort((a, b) => a.distance - b.distance);

					setNearbyUsers(nearby);
					setIsLoading(false);
					setError(null);
				},
				(err) => {
					console.error("❌ Erro ao buscar usuários próximos:", err);
					setError("Erro ao buscar usuários próximos");
					setIsLoading(false);
				}
			);

			return () => {
				unsubscribe();
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
