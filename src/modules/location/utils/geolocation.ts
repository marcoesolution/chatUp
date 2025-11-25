/**
 * Utilitários para cálculos geográficos
 */

import type { Location } from "../types";

/**
 * Raio da Terra em metros
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param lat1 Latitude do primeiro ponto
 * @param lon1 Longitude do primeiro ponto
 * @param lat2 Latitude do segundo ponto
 * @param lon2 Longitude do segundo ponto
 * @returns Distância em metros
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = EARTH_RADIUS_METERS * c;

	return distance;
}

/**
 * Converte graus para radianos
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Calcula a distância entre duas localizações
 */
export function calculateLocationDistance(location1: Location, location2: Location): number {
	return calculateDistance(location1.latitude, location1.longitude, location2.latitude, location2.longitude);
}

/**
 * Verifica se uma localização está dentro de um raio específico
 * @param centerLocation Localização central
 * @param targetLocation Localização a verificar
 * @param radiusMeters Raio em metros
 * @returns true se estiver dentro do raio
 */
export function isWithinRadius(centerLocation: Location, targetLocation: Location, radiusMeters: number): boolean {
	const distance = calculateLocationDistance(centerLocation, targetLocation);
	return distance <= radiusMeters;
}

/**
 * Calcula os limites de uma bounding box (caixa delimitadora) para uma localização e raio
 * Útil para queries no Firestore que precisam filtrar por área aproximada
 * @param centerLocation Localização central
 * @param radiusMeters Raio em metros
 * @returns Objeto com limites norte, sul, leste e oeste
 */
export function calculateBoundingBox(
	centerLocation: Location,
	radiusMeters: number
): {
	north: number;
	south: number;
	east: number;
	west: number;
} {
	const lat = centerLocation.latitude;
	const lon = centerLocation.longitude;

	// Aproximação: 1 grau de latitude ≈ 111 km
	// 1 grau de longitude ≈ 111 km * cos(latitude)
	const latDelta = radiusMeters / 111000;
	const lonDelta = radiusMeters / (111000 * Math.cos(toRadians(lat)));

	return {
		north: lat + latDelta,
		south: lat - latDelta,
		east: lon + lonDelta,
		west: lon - lonDelta,
	};
}

/**
 * Raio padrão para busca de usuários próximos
 * TODO: TEMPORÁRIO PARA TESTES - Alterado de 2km (2000m) para 500km (500000m)
 * Reverter para 2000 após os testes
 */
export const NEARBY_RADIUS_METERS = 500000; // 500km - TEMPORÁRIO PARA TESTES
