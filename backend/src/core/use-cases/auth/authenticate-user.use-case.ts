import { IUserRepository } from '../../interfaces/user.repository.interface';
import { IPasswordHasher } from '../../interfaces/password-hasher.interface';
import { ITokenService } from '../../interfaces/token-service.interface';
import { AuthenticateUserDto, AuthenticationResult } from '../../dtos/authenticate-user.dto';

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: AuthenticateUserDto): Promise<AuthenticationResult> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new Error('User not found');
    }

    if (!dto.password) {
       throw new Error('Password required');
    }

    const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.tokenService.generateToken(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    };
  }
}
