export class User {
  id: string;
  email: string; // Replaced username
  passwordHash: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  latitude?: number;
  longitude?: number;

  publicKey?: string; // For Signal Protocol / E2EE
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
