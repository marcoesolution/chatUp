export class AuthenticateUserDto {
  email: string;
  password: string;
  publicKey?: string; // Optional: If we want to update public key on login
}

export class AuthenticationResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  };
}
