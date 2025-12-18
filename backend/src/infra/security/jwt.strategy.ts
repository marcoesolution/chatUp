
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SECRET_KEY_DEV', // TODO: Load from env
    });
  }

  async validate(payload: any) {
    console.log(`🔐 [AUTH] Validating JWT payload:`, payload);
    const id = payload.sub || payload.userId;
    if (!id) {
        console.warn(`⚠️ [AUTH] No user ID found in payload`);
        return null;
    }
    return { id, userId: id, email: payload.email };
  }
}
