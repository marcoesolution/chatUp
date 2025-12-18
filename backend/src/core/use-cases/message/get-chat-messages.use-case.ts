import { IMessageRepository } from '../../interfaces/message.repository.interface';
import { Message } from '../../entities/message.entity';

export class GetChatMessagesUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  async execute(userId: string, contactId: string, limit: number = 20, offset: number = 0): Promise<Message[]> {
    return this.messageRepository.findChatMessages(userId, contactId, limit, offset);
  }
}
