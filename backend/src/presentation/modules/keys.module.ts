import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysController } from '../controllers/keys.controller';
import { TypeOrmKeyRepository } from '../../infra/database/typeorm-key.repository';
import { Key } from '../../core/entities/key.entity';
import { PreKey } from '../../core/entities/pre-key.entity';
import { AuthModule } from './auth.module'; // For Guards? Usually global or exported
// Actually JwtAuthGuard relies on Passport strategies provided by AuthModule usually? 
// Or just import PassportModule? We'll see. Assuming AuthModule exports Strategy.

@Module({
  imports: [
    TypeOrmModule.forFeature([Key, PreKey]),
  ],
  controllers: [KeysController],
  providers: [
    {
      provide: 'IKeyRepository',
      useClass: TypeOrmKeyRepository,
    },
  ],
  exports: ['IKeyRepository'],
})
export class KeysModule {}
