import { Entity, Column, PrimaryColumn, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { PreKey } from './pre-key.entity';
import { TypeOrmUserEntity } from '../../infra/database/entities/typeorm-user.entity';

@Entity('keys')
export class Key {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => TypeOrmUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: TypeOrmUserEntity;

  @Column()
  identityKey: string; // Base64 (Signal Identity)

  @Column({ nullable: true })
  publicKey: string; // Base64 (Legacy/Simple E2EE)

  @Column('int')
  registrationId: number;

  @Column('jsonb')
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };

  @OneToMany(() => PreKey, (preKey) => preKey.key)
  preKeys: PreKey[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
