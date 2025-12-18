import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TypeOrmUserEntity } from './infra/database/entities/typeorm-user.entity';
import { Key } from './core/entities/key.entity';
import { PreKey } from './core/entities/pre-key.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { KeyHelper } from 'libsignal-protocol-typescript';

// Helper to convert ArrayBuffer to Base64
function toBase64(ab: ArrayBuffer): string {
    return Buffer.from(ab).toString('base64');
}

// Helper to generate a valid Signal Key Bundle using libsignal directly
async function generateSignalBundle() {
  // 1. Generate Identity Key Pair
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  
  // 2. Generate Registration ID
  const registrationId = KeyHelper.generateRegistrationId();
  
  // 3. Generate Signed PreKey
  const signedPreKeyId = 1;
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
  
  // 4. Simple E2EE fallback (just a random 33-byte key with 0x05 prefix)
  const simplePubKey = Buffer.concat([Buffer.from([0x05]), crypto.randomBytes(32)]).toString('base64');

  return {
    identityKey: toBase64(identityKeyPair.pubKey),
    registrationId: registrationId,
    publicKey: simplePubKey,
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: toBase64(signedPreKey.keyPair.pubKey),
      signature: toBase64(signedPreKey.signature),
    }
  };
}

// Helper to generate a single PreKey
async function genPreKey(id: number) {
  const preKey = await KeyHelper.generatePreKey(id);
  return {
      keyId: preKey.keyId,
      publicKey: toBase64(preKey.keyPair.pubKey)
  };
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get(getRepositoryToken(TypeOrmUserEntity));
  const keyRepo = app.get(getRepositoryToken(Key));
  const preKeyRepo = app.get(getRepositoryToken(PreKey));

  const users = [
    {
      id: '2190b33a-1bda-4956-a543-465499bd7b14', // Using the ID from the error
      email: 'ana@example.com',
      password: 'password123',
      displayName: 'Ana Silva',
      latitude: -17.803000,
      longitude: -50.920000,
      bio: 'Adoro conversar!',
    },
    {
      email: 'pedro@example.com',
      password: 'password123',
      displayName: 'Pedro Santos',
      latitude: -17.805000,
      longitude: -50.922000,
      bio: 'Buscando novas amizades.',
    },
    {
      email: 'carla@example.com',
      password: 'password123',
      displayName: 'Carla Oliveira',
      latitude: -17.801000,
      longitude: -50.919000,
      bio: 'Interessada em tecnologia.',
    },
  ];

  console.log('🌱 Seeding users and their E2EE keys...');

  for (const u of users) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    
    if (!user) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      user = userRepo.create({
        id: u.id,
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        latitude: u.latitude,
        longitude: u.longitude,
        bio: u.bio,
      });
      user = await userRepo.save(user);
      console.log(`✅ Created user: ${u.email}`);
    } else {
      console.log(`ℹ️ User already exists: ${u.email}`);
    }

    // Force update/create the Key bundle for this user with valid signatures
    const userId = user.id;
    const bundle = await generateSignalBundle();

    const keyBundle = keyRepo.create({
      userId,
      identityKey: bundle.identityKey,
      publicKey: bundle.publicKey,
      registrationId: bundle.registrationId,
      signedPreKey: bundle.signedPreKey,
      updatedAt: new Date(),
    });
    
    // Clear existing keys first to ensure we have a fresh valid set
    await preKeyRepo.delete({ userId });
    await keyRepo.delete({ userId });
    
    await keyRepo.save(keyBundle);
    console.log(`🔑 Created VALID E2EE Key bundle for: ${u.email}`);

    // Add some PreKeys
    const preKeys = [];
    for (let i = 1; i <= 20; i++) {
      const pk = await genPreKey(i);
      preKeys.push(preKeyRepo.create({
        userId,
        keyId: pk.keyId,
        publicKey: pk.publicKey,
      }));
    }
    await preKeyRepo.save(preKeys);
    console.log(`📦 Created 20 PreKeys for: ${u.email}`);
  }

  console.log('✅ Seeding complete!');
  await app.close();
  process.exit(0);
}

bootstrap();
