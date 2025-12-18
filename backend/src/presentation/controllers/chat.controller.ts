import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetChatMessagesUseCase } from '../../core/use-cases/message/get-chat-messages.use-case';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly getChatMessagesUseCase: GetChatMessagesUseCase) {}

  @Get('messages/:contactId')
  async getMessages(
    @Request() req: any,
    @Param('contactId') contactId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    const userId = req.user.userId;
    const messages = await this.getChatMessagesUseCase.execute(
      userId,
      contactId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      timestamp: m.timestamp,
      isDelivered: m.isDelivered,
      isRead: m.isRead,
    }));
  }
}
