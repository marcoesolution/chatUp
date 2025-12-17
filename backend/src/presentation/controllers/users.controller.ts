import { Controller, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Assumes JwtAuthGuard will be used or standard Passport
import { UpdateUserUseCase } from '../../core/use-cases/user/update-user.use-case';
import { UpdateUserDto } from '../../core/dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly updateUserUseCase: UpdateUserUseCase) {}

  @Put(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Implement Guard
  async update(@Param('id') id: string, @Body() body: Partial<UpdateUserDto>) {
    const dto: UpdateUserDto = {
      userId: id,
      ...body,
    };
    const user = await this.updateUserUseCase.execute(dto);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio
    };
  }
}
