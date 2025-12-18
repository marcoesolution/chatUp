import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from '../../infra/websockets/chat.gateway';
import { ChatController } from '../controllers/chat.controller';
import { SendMessageUseCase } from '../../core/use-cases/message/send-message.use-case';
import { GetChatMessagesUseCase } from '../../core/use-cases/message/get-chat-messages.use-case';
import { TypeOrmMessageRepository } from '../../infra/database/typeorm-message.repository';
import { TypeOrmMessageEntity } from '../../infra/database/entities/typeorm-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeOrmMessageEntity])],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    TypeOrmMessageRepository,
    {
      provide: SendMessageUseCase,
      useFactory: (repo: TypeOrmMessageRepository) => new SendMessageUseCase(repo),
      inject: [TypeOrmMessageRepository],
    },
    {
      provide: GetChatMessagesUseCase,
      useFactory: (repo: TypeOrmMessageRepository) => new GetChatMessagesUseCase(repo),
      inject: [TypeOrmMessageRepository],
    },
  ],
})
export class ChatModule {}
