import { CreateUserUseCase } from './create-user.use-case';
import { IUserRepository } from '../../interfaces/user.repository.interface';
import { IPasswordHasher } from '../../interfaces/password-hasher.interface';
import { User } from '../../entities/user.entity';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

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

    useCase = new CreateUserUseCase(userRepository, passwordHasher);
  });

  it('should create a new user successfully', async () => {
    const dto = {
      email: 'newuser@example.com',
      password: 'newpassword',
      displayName: 'New User',
    };

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed_password');
    userRepository.create.mockImplementation(async (user) => {
      user.id = 'generated_id';
      return user;
    });

    const result = await useCase.execute(dto);

    expect(result.id).toBe('generated_id');
    expect(result.email).toBe('newuser@example.com');
    expect(result.passwordHash).toBe('hashed_password');
    expect(result.displayName).toBe('New User');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
    expect(passwordHasher.hash).toHaveBeenCalledWith('newpassword');
    expect(userRepository.create).toHaveBeenCalled();
  });

  it('should throw error if email already exists', async () => {
    const dto = { email: 'existing@example.com', password: 'password' };
    
    // Simulate existing user
    userRepository.findByEmail.mockResolvedValue(new User({ id: '1', email: 'existing@example.com' } as any));

    await expect(useCase.execute(dto)).rejects.toThrow('Email already exists');
    
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error if password is missing', async () => {
    const dto = { email: 'user@example.com', password: '' };
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow('Password required');
  });
});
