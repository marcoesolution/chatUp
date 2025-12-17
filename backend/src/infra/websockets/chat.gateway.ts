import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SendMessageUseCase } from '../../core/use-cases/message/send-message.use-case';
import { SendMessageDto } from '../../core/dtos/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for production
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Authenticate client via handshake query or headers here
    const userId = client.handshake.query.userId;
    if (userId) {
       client.join(userId); // Join a room for their user ID
       console.log(`Client ${client.id} joined room ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('Received message:', dto);
    
    // Save to DB
    const message = await this.sendMessageUseCase.execute(dto);

    // Emit to Receiver
    this.server.to(dto.receiverId).emit('newMessage', message);
    
    // Ack to Sender
    return { status: 'ok', message };
  }
}
