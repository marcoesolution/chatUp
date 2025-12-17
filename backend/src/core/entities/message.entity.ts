export class Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string; // Encrypted content (base64 or stringified JSON)
  timestamp: Date;
  // Metadata for Signal Protocol or tracking
  isDelivered: boolean;
  isRead: boolean;

  constructor(props: Partial<Message>) {
    Object.assign(this, props);
  }
}
