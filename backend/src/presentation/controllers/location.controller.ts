import { Controller, Get, Body, Put, UseGuards, Request, Query, ParseFloatPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmUserEntity } from '../../infra/database/entities/typeorm-user.entity';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(
    @InjectRepository(TypeOrmUserEntity)
    private userRepository: Repository<TypeOrmUserEntity>,
  ) {}

  @Put()
  async updateLocation(
    @Request() req: any,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const userId = req.user.id;
    await this.userRepository.update(userId, {
      latitude: body.latitude,
      longitude: body.longitude,
    });
    return { status: 'ok' };
  }

  @Get('nearby')
  async getNearbyUsers(
    @Request() req: any,
    @Query('latitude', new ParseFloatPipe()) lat: number,
    @Query('longitude', new ParseFloatPipe()) long: number,
    @Query('radius', new ParseFloatPipe({ optional: true })) radiusKv: number = 2,
  ) {
    const currentUserId = req.user.id;
    const radiusKm = radiusKv || 2;

    console.log(`📍 Finding nearby users for ${currentUserId}: lat=${lat}, long=${long}, radius=${radiusKm}`);

    // Haversine formula in raw SQL for Postgres
    // Numerical stability: acos(LEAST(1, GREATEST(-1, ...)))
    const query = `
      SELECT 
        id, 
        email, 
        display_name as "displayName", 
        photo_url as "photoURL",
        latitude, 
        longitude,
        (
          6371 * acos(
            LEAST(1, GREATEST(-1, 
              cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            ))
          )
        ) AS distance
      FROM users
      WHERE id != $3
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      GROUP BY id, email, display_name, photo_url, latitude, longitude
      HAVING (
        6371 * acos(
          LEAST(1, GREATEST(-1, 
            cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          ))
        )
      ) < $4
      ORDER BY distance ASC
      LIMIT 50;
    `;

    try {
        const users = await this.userRepository.query(query, [
            lat,
            long,
            currentUserId,
            radiusKm,
        ]);

        console.log(`✅ Found ${users.length} nearby users`);

        return users.map((u: any) => ({
            id: u.id,
            name: u.displayName || u.email.split('@')[0],
            avatar: u.photoURL,
            location: {
                latitude: u.latitude,
                longitude: u.longitude
            },
            distance: Math.round(u.distance * 1000) // Convert to meters
        }));
    } catch (error) {
        console.error("❌ SQL Error in getNearbyUsers:", error);
        throw error;
    }
  }
}
