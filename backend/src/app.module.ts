import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './presentation/modules/auth.module';
import { UsersModule } from './presentation/modules/users.module';
import { ChatModule } from './presentation/modules/chat.module'; // Added ChatModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUserEntity } from './infra/database/entities/typeorm-user.entity';
import { TypeOrmMessageEntity } from './infra/database/entities/typeorm-message.entity';

import { KeysModule } from './presentation/modules/keys.module';
import { Key } from './core/entities/key.entity';
import { PreKey } from './core/entities/pre-key.entity';
import { LocationModule } from './presentation/modules/location.module';
import { FilesModule } from './presentation/modules/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'chatup',
      entities: [TypeOrmUserEntity, TypeOrmMessageEntity, Key, PreKey], // Add Entities
      synchronize: true, // Auto-create tables (Dev only)
      logging: true, // Enable SQL logging for debugging
    }),
    AuthModule,
    UsersModule,
    ChatModule,
    KeysModule,
    LocationModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
