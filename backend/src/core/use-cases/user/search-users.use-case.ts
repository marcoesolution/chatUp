import { IUserRepository } from '../../interfaces/user.repository.interface';
import { User } from '../../entities/user.entity';

export class SearchUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: string): Promise<User[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.userRepository.search(query.trim());
  }
}
