import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmUserEntity } from './entities/typeorm-user.entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { User } from '../../core/entities/user.entity';

describe('TypeOrmUserRepository Integration', () => {
  let repository: TypeOrmUserRepository;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'admin',
          password: 'password',
          database: 'chatup',
          entities: [TypeOrmUserEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([TypeOrmUserEntity]),
      ],
      providers: [TypeOrmUserRepository],
    }).compile();

    repository = module.get<TypeOrmUserRepository>(TypeOrmUserRepository);
  });

  it('should save and find a user', async () => {
    const timestamp = Date.now();
    const newUser = new User({
      id: undefined, // Let DB generate UUID
      email: `integration_test_${timestamp}@example.com`,
      passwordHash: 'hash123',
      publicKey: 'pubkey123',
      username: undefined, // remove or ensure it's not set if property removed
    });

    // 1. Save
    const savedUser = await repository.create(newUser);
    expect(savedUser.id).toBeDefined();
    expect(savedUser.email).toBe(newUser.email);

    // 2. Find by Email
    const foundUser = await repository.findByEmail(newUser.email);
    expect(foundUser).not.toBeNull();
    expect(foundUser!.id).toBe(savedUser.id);
    expect(foundUser!.passwordHash).toBe('hash123');

    // 3. Find by ID
    const foundById = await repository.findById(savedUser.id);
    expect(foundById).not.toBeNull();
    expect(foundById!.email).toBe(newUser.email);
  });
});
