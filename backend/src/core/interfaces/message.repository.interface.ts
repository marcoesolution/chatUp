import { Message } from '../entities/message.entity';

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  findByUserId(userId: string): Promise<Message[]>; // Inbox
  markAsDelivered(messageId: string): Promise<void>;
}
