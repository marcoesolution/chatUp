import { IUserRepository } from '../../interfaces/user.repository.interface';
import { UpdateUserDto } from '../../dtos/update-user.dto';
import { User } from '../../entities/user.entity';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.photoURL !== undefined) user.photoURL = dto.photoURL;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    // Email updates might require verification, skipping for now unless explicit
    
    // TypeORM save() acts as upsert if ID exists.
    return this.userRepository.update(user); 
  }
}
