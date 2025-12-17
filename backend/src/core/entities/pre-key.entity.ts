import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Key } from './key.entity';

@Entity('pre_keys')
export class PreKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Key, (key) => key.preKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  key: Key;

  @Column('int')
  keyId: number;

  @Column()
  publicKey: string; // Base64
}
