import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthenticateUserUseCase } from '../../core/use-cases/auth/authenticate-user.use-case';
import { CreateUserUseCase } from '../../core/use-cases/user/create-user.use-case';
import { AuthenticateUserDto } from '../../core/dtos/authenticate-user.dto';
import { CreateUserDto } from '../../core/dtos/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AuthenticateUserDto) {
    return this.authenticateUserUseCase.execute(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto);
    // Auto-login after register? Or just return user.
    // For now, return the user, frontend can then call login or we can generate token here.
    // Let's return the user for now to check success.
    
    // To be compatible with frontend expectations, we might want to return a token too, 
    // but the simplest flow is Register -> then Login.
    return {
       user: {
         id: user.id,
         username: user.email, // Mapping email to username for now to satisfy simple DTO if needed, or better yet, return email
        email: user.email,
         displayName: user.displayName,
       }
    };
  }
}
