import { IUserRepository } from '../../core/interfaces/user.repository.interface';
import { User } from '../../core/entities/user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [
    // Pre-create a user for testing (password is 'password' hashed with bcrypt cost 10)
    new User({
      id: '1',
      email: 'test@test.com',
      passwordHash: '$2b$10$TF88k7D.bXH3vuNjEwynxOLR2dWEYCgc8qy89z4UnaQyW0ThwZGiC', // password: 'password'
      createdAt: new Date(),
    }),
  ];

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async update(user: User): Promise<User> {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.users[index] = user;
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async search(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return this.users.filter(
      (u) =>
        u.email.toLowerCase().includes(lowerQuery) ||
        (u.displayName && u.displayName.toLowerCase().includes(lowerQuery)),
    );
  }
}
