import { IMessageRepository } from '../../interfaces/message.repository.interface';
import { SendMessageDto } from '../../dtos/send-message.dto';
import { Message } from '../../entities/message.entity';

export class SendMessageUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  async execute(dto: SendMessageDto): Promise<Message> {
    // Basic validation
    if (!dto.content || !dto.receiverId || !dto.senderId) {
      throw new Error('Invalid message data');
    }

    const newMessage = new Message({
      id: undefined, // Let DB generate
      senderId: dto.senderId,
      receiverId: dto.receiverId,
      content: dto.content,
      timestamp: new Date(),
      isDelivered: false,
      isRead: false,
    });

    return this.messageRepository.create(newMessage);
  }
}
