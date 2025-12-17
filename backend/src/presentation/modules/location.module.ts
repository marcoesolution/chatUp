import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationController } from '../controllers/location.controller';
import { TypeOrmUserEntity } from '../../infra/database/entities/typeorm-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeOrmUserEntity])],
  controllers: [LocationController],
})
export class LocationModule {}
