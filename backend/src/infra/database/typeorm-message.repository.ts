import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMessageRepository } from '../../core/interfaces/message.repository.interface';
import { Message } from '../../core/entities/message.entity';
import { TypeOrmMessageEntity } from './entities/typeorm-message.entity';

@Injectable()
export class TypeOrmMessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(TypeOrmMessageEntity)
    private readonly repository: Repository<TypeOrmMessageEntity>,
  ) {}

  async create(message: Message): Promise<Message> {
    const entity = this.repository.create({
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      isDelivered: message.isDelivered,
      isRead: message.isRead,
    });
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findByUserId(userId: string): Promise<Message[]> {
     // Find messages where user is receiver (inbox) or sender (outbox)
     // For now, let's just return received messages for "Inbox" view
     const entities = await this.repository.find({
       where: [{ receiverId: userId }, { senderId: userId }],
       order: { timestamp: 'ASC' }
     });
     return entities.map(e => this.toDomain(e));
  }

  async markAsDelivered(messageId: string): Promise<void> {
    await this.repository.update(messageId, { isDelivered: true });
  }

  private toDomain(entity: TypeOrmMessageEntity): Message {
    return new Message({
      id: entity.id,
      senderId: entity.senderId,
      receiverId: entity.receiverId,
      content: entity.content,
      timestamp: entity.timestamp,
      isDelivered: entity.isDelivered,
      isRead: entity.isRead,
    });
  }
}
