export interface ITokenService {
  generateToken(payload: any): Promise<string>;
  verifyToken(token: string): Promise<any>;
}
