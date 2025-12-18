import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from '../controllers/users.controller';
import { UpdateUserUseCase } from '../../core/use-cases/user/update-user.use-case';
import { SearchUsersUseCase } from '../../core/use-cases/user/search-users.use-case';
import { TypeOrmUserRepository } from '../../infra/database/typeorm-user.repository';
import { TypeOrmUserEntity } from '../../infra/database/entities/typeorm-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeOrmUserEntity])],
  controllers: [UsersController],
  providers: [
    TypeOrmUserRepository,
    {
      provide: UpdateUserUseCase,
      useFactory: (repo: TypeOrmUserRepository) => new UpdateUserUseCase(repo),
      inject: [TypeOrmUserRepository],
    },
    {
      provide: SearchUsersUseCase,
      useFactory: (repo: TypeOrmUserRepository) => new SearchUsersUseCase(repo),
      inject: [TypeOrmUserRepository],
    },
  ],
  exports: [TypeOrmUserRepository],
})
export class UsersModule {}
