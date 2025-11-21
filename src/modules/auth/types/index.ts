/**
 * Tipos relacionados ao módulo de autenticação
 */

import type { Location } from '@/modules/location/types';

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	email: string;
	password: string;
	name: string;
}

export interface AuthResponse {
	user: {
		id: string;
		email: string;
		name: string;
	};
	token: string;
	refreshToken?: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: AuthResponse["user"] | null;
	token: string | null;
}

/**
 * Tipos para Firebase Auth
 */
export interface UserProfile {
	id: string;
	email: string;
	displayName: string;
	hasProfile: boolean;
	photoURL?: string;
	phoneNumber?: string;
	bio?: string;
	location?: Location;
	isLocationEnabled?: boolean; // sempre true (obrigatório)
	createdAt?: any; // Firestore Timestamp
	updatedAt?: any; // Firestore Timestamp
}

export interface CreateProfileData {
	email: string;
	displayName: string;
	photoURL?: string;
	phoneNumber?: string;
	bio?: string;
}
