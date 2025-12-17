import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class TypeOrmMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  senderId: string;

  @Column('uuid')
  receiverId: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ default: false })
  isDelivered: boolean;

  @Column({ default: false })
  isRead: boolean;
}
