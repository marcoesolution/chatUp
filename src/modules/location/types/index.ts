/**
 * Tipos relacionados ao módulo de localização
 */

import { Timestamp } from 'firebase/firestore';

export interface Location {
	latitude: number;
	longitude: number;
	updatedAt: Timestamp | Date;
}

export interface UserLocation {
	location: Location;
	isLocationEnabled: boolean;
}

export interface NearbyUser {
	id: string;
	name: string;
	avatar?: string;
	location: Location;
	distance: number; // em metros
}

export interface LocationPermissionStatus {
	granted: boolean;
	canAskAgain: boolean;
	status: 'granted' | 'denied' | 'undetermined';
}

