
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
    // payload is the decoded JWT
    // We return what we want likely accessible in req.user
    return { userId: payload.sub || payload.userId, email: payload.email };
  }
}
