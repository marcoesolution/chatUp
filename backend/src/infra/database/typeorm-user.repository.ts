import { IUserRepository } from '../../core/interfaces/user.repository.interface';
import { User } from '../../core/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmUserEntity } from './entities/typeorm-user.entity';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(TypeOrmUserEntity)
    private readonly repository: Repository<TypeOrmUserEntity>,
  ) {}

  async create(user: User): Promise<User> {
    const entity = UserMapper.toPersistence(user);
    const savedEntity = await this.repository.save(entity);
    return UserMapper.toDomain(savedEntity);
  }

  async update(user: User): Promise<User> {
    const entity = UserMapper.toPersistence(user);
    const savedEntity = await this.repository.save(entity);
    return UserMapper.toDomain(savedEntity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    if (!entity) return null;
    return UserMapper.toDomain(entity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return UserMapper.toDomain(entity);
  }
}
