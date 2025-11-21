/**
 * Tipos relacionados ao módulo de perfil
 */

import { User } from '@/shared/types';

export interface Profile extends User {
  bio?: string;
  phone?: string;
  location?: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar?: string;
}

