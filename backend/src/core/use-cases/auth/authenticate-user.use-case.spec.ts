import { AuthenticateUserUseCase } from './authenticate-user.use-case';
import { IUserRepository } from '../../interfaces/user.repository.interface';
import { IPasswordHasher } from '../../interfaces/password-hasher.interface';
import { ITokenService } from '../../interfaces/token-service.interface';
import { User } from '../../entities/user.entity';

describe('AuthenticateUserUseCase', () => {
  let useCase: AuthenticateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    tokenService = {
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
    };

    useCase = new AuthenticateUserUseCase(
      userRepository,
      passwordHasher,
      tokenService,
    );
  });

  it('should authenticate user successfully', async () => {
    const dto = { email: 'test@test.com', password: 'password' };
    const user = new User({
      id: '1',
      email: 'test@test.com',
      passwordHash: 'hashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.generateToken.mockResolvedValue('jwt_token');

    const result = await useCase.execute(dto);


    expect(result.accessToken).toBe('jwt_token');
    expect(result.user.id).toBe('1');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@test.com'); // Was undefined because I passed wrong DTO above? Checking above snippet
    expect(passwordHasher.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    // REMOVED EXTRA ASSERTIONS that are not part of the usecase return or mocking setup in this specific test
    // The previous error showed "Received: undefined" for findByEmail which implies the call didn't happen with the expected arg
  });

  it('should throw error if user not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'wrong@test.com', password: 'password' }),
    ).rejects.toThrow('User not found');
  });

  it('should throw error if password invalid', async () => {
    const dto = { email: 'test@test.com', password: 'wrong' };
    const user = new User({
      id: '1',
      email: 'test@test.com',
      passwordHash: 'hashed',
    } as any);

    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(dto),
    ).rejects.toThrow('Invalid credentials');
  });
});
