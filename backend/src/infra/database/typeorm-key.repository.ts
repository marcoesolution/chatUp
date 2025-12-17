import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IKeyRepository } from '../../core/interfaces/key.repository.interface';
import { Key } from '../../core/entities/key.entity';
import { PreKey } from '../../core/entities/pre-key.entity';

@Injectable()
export class TypeOrmKeyRepository implements IKeyRepository {
  constructor(
    @InjectRepository(Key)
    private readonly keyRepo: Repository<Key>,
    @InjectRepository(PreKey)
    private readonly preKeyRepo: Repository<PreKey>,
    private dataSource: DataSource,
  ) {}

  async createOrUpdateKey(keyData: Partial<Key>): Promise<Key> {
    const existing = await this.keyRepo.findOneBy({ userId: keyData.userId });
    if (existing) {
        return this.keyRepo.save({ ...existing, ...keyData });
    }
    const newKey = this.keyRepo.create(keyData);
    return this.keyRepo.save(newKey);
  }

  async addPreKeys(userId: string, preKeys: { keyId: number; publicKey: string }[]): Promise<void> {
    const entities = preKeys.map(pk => this.preKeyRepo.create({
        userId,
        keyId: pk.keyId,
        publicKey: pk.publicKey
    }));
    await this.preKeyRepo.save(entities);
  }

  async countPreKeys(userId: string): Promise<number> {
      return this.preKeyRepo.countBy({ userId });
  }

  // Critical: Fetch Bundle and Pop One PreKey Atomically
  async getKeyBundle(userId: string): Promise<{ key: Key; preKey?: PreKey } | null> {
    return this.dataSource.transaction(async (manager) => {
        const key = await manager.findOne(Key, { where: { userId } });
        if (!key) return null;

        // Fetch one random prekey
        // Sorting by ID to get oldest? Or random?
        // Signal usually says "fetch one".
        const preKey = await manager.findOne(PreKey, {
            where: { userId },
            order: { keyId: 'ASC' }, 
            lock: { mode: 'pessimistic_write' } // Lock it so no one else grabs it
        });

        if (preKey) {
            await manager.remove(preKey);
        }

        return { key, preKey: preKey || undefined };
    });
  }

  async consumePreKey(userId: string, preKeyId: number): Promise<void> {
      await this.preKeyRepo.delete({ userId, keyId: preKeyId });
  }
}
