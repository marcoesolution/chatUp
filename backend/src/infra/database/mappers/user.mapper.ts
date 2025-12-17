import { User } from '../../../core/entities/user.entity';
import { TypeOrmUserEntity } from '../entities/typeorm-user.entity';

export class UserMapper {
  static toDomain(typeOrmUser: TypeOrmUserEntity): User {
    return new User({
      id: typeOrmUser.id,
      email: typeOrmUser.email,
      passwordHash: typeOrmUser.passwordHash,
      displayName: typeOrmUser.displayName,
      photoURL: typeOrmUser.photoURL,
      phoneNumber: typeOrmUser.phoneNumber,
      bio: typeOrmUser.bio,
      latitude: typeOrmUser.latitude,
      longitude: typeOrmUser.longitude,
      publicKey: typeOrmUser.publicKey,
      createdAt: typeOrmUser.createdAt,
      updatedAt: typeOrmUser.updatedAt,
    });
  }

  static toPersistence(user: User): TypeOrmUserEntity {
    const entity = new TypeOrmUserEntity();
    if (user.id) entity.id = user.id;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.displayName = user.displayName;
    entity.photoURL = user.photoURL;
    entity.phoneNumber = user.phoneNumber;
    entity.bio = user.bio;
    entity.publicKey = user.publicKey;
    entity.latitude = user.latitude;
    entity.longitude = user.longitude;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    return entity;
  }
}
