/**
 * Hook para buscar usuários próximos (raio de 2km)
 */

import { useState, useEffect } from 'react';
import {
	collection,
	query,
	where,
	onSnapshot,
	QuerySnapshot,
	DocumentData,
} from 'firebase/firestore';
import { db } from '@/core/firebase';
import { useAuth } from '@/modules/auth';
import { useLocation } from './useLocation';
import {
	calculateLocationDistance,
	isWithinRadius,
	NEARBY_RADIUS_METERS,
	calculateBoundingBox,
} from '../utils/geolocation';
import type { NearbyUser, Location } from '../types';
import type { UserProfile } from '@/modules/auth/types';

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
	const { location: userLocation, permissionStatus } = useLocation();
	const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!firebaseUser || !userLocation || !permissionStatus?.granted || !db) {
			if (!firebaseUser) {
				setError('Usuário não autenticado');
			} else if (!userLocation) {
				setError('Localização não disponível');
			} else if (!permissionStatus?.granted) {
				setError('Permissão de localização negada');
			}
			setIsLoading(false);
			setNearbyUsers([]);
			return;
		}

		setError(null);
		setIsLoading(true);

		try {
			// Firestore não suporta queries geográficas nativas nem múltiplas condições de range
			// Vamos buscar todos os usuários com localização habilitada e filtrar no cliente
			// Para melhor performance, podemos limitar a busca inicial
			const usersQuery = query(
				collection(db, 'users'),
				where('isLocationEnabled', '==', true)
			);

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
								name: userData.displayName || 'Usuário',
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
					console.error('❌ Erro ao buscar usuários próximos:', err);
					setError('Erro ao buscar usuários próximos');
					setIsLoading(false);
				}
			);

			return () => {
				unsubscribe();
			};
		} catch (err: any) {
			console.error('❌ Erro ao configurar query de usuários próximos:', err);
			setError(err.message || 'Erro ao buscar usuários próximos');
			setIsLoading(false);
		}
	}, [firebaseUser?.uid, userLocation?.latitude, userLocation?.longitude, permissionStatus?.granted]);

	return {
		nearbyUsers,
		isLoading,
		error,
	};
}

