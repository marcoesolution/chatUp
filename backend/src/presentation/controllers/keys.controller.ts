import { Controller, Post, Get, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IKeyRepository } from '../../core/interfaces/key.repository.interface';
import { Inject } from '@nestjs/common';

@Controller('keys')
export class KeysController {
  constructor(
    @Inject('IKeyRepository')
    private readonly keyRepo: IKeyRepository,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async uploadKeyBundle(@Request() req: any, @Body() body: any) {
    const userId = req.user.userId;
    const { identityKey, registrationId, signedPreKey, publicKey } = body;

    await this.keyRepo.createOrUpdateKey({
        userId,
        identityKey,
        registrationId,
        signedPreKey,
        publicKey
    });

    if (body.preKeys && Array.isArray(body.preKeys)) {
        await this.keyRepo.addPreKeys(userId, body.preKeys);
    }

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  async getKeyBundle(@Param('userId') userId: string) {
    const bundle = await this.keyRepo.getKeyBundle(userId);
    if (!bundle) {
        throw new NotFoundException('Key bundle not found for user');
    }

    // Format for frontend
    return {
        identityKey: bundle.key.identityKey,
        registrationId: bundle.key.registrationId,
        signedPreKey: bundle.key.signedPreKey,
        publicKey: bundle.key.publicKey,
        preKey: bundle.preKey ? {
            keyId: bundle.preKey.keyId,
            publicKey: bundle.preKey.publicKey
        } : undefined
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('count/me')
  async getPreKeyCount(@Request() req: any) {
      const count = await this.keyRepo.countPreKeys(req.user.userId);
      return { count };
  }
}
