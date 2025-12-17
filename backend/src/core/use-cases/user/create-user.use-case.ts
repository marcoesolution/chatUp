import { IUserRepository } from '../../interfaces/user.repository.interface';
import { IPasswordHasher } from '../../interfaces/password-hasher.interface';
import { CreateUserDto } from '../../dtos/create-user.dto';
import { User } from '../../entities/user.entity';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    if (!dto.password) {
      throw new Error('Password required');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const newUser = new User({
      id: undefined, // Let DB generate
      email: dto.email,
      passwordHash: passwordHash,
      displayName: dto.displayName,
      publicKey: dto.publicKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.userRepository.create(newUser);
  }
}
