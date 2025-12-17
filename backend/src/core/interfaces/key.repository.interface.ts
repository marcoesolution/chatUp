import { Action } from 'rxjs/internal/scheduler/Action';
import { Key } from '../entities/key.entity';
import { PreKey } from '../entities/pre-key.entity';

export abstract class IKeyRepository {
  abstract createOrUpdateKey(key: Partial<Key>): Promise<Key>;
  abstract addPreKeys(userId: string, preKeys: { keyId: number; publicKey: string }[]): Promise<void>;
  abstract countPreKeys(userId: string): Promise<number>;
  abstract getKeyBundle(userId: string): Promise<{ key: Key; preKey?: PreKey } | null>;
  abstract consumePreKey(userId: string, preKeyId: number): Promise<void>;
}
