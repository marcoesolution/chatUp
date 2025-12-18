import { Message } from '../entities/message.entity';

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  findByUserId(userId: string): Promise<Message[]>; // Inbox
  findChatMessages(userId1: string, userId2: string, limit: number, offset: number): Promise<Message[]>;
  markAsDelivered(messageId: string): Promise<void>;
}
