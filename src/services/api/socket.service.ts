import io, { Socket } from 'socket.io-client';
import { API_URL } from '@/services/api';

class SocketService {
  public socket: Socket | null = null;

  connect(userId: string) {
    // If socket exists and is connected, don't reconnect
    if (this.socket?.connected) {
        console.log("✅ Socket already connected");
        return; 
    }
    
    // If socket exists but disconnected, try connecting manually
    if (this.socket && !this.socket.connected) {
        console.log("🔄 Reconnecting existing socket...");
        this.socket.connect();
        return;
    }

    console.log("🔌 Initializing Socket.io connection to:", API_URL);

    this.socket = io(API_URL, {
      query: { userId },
      transports: ['websocket'], // FORCE WebSocket only
      upgrade: false, // Disable long-polling upgrade (crucial for RN stability)
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully. ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('⚠️ Socket connection error:', err.message);
      // Detailed error logging might help
    });
    
    this.socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnection attempt #${attempt}`);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting socket manually");
      this.socket.disconnect();
      // Do not nullify immediately if you want to reuse, but for singleton usually safe to keep instance
      // this.socket = null; 
    }
  }

  sendMessage(payload: { senderId: string; receiverId: string; content: string }) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sendMessage', payload, (response: any) => {
          console.log('📤 Message delivered acknowledge:', response);
      });
    } else {
        console.warn("⚠️ Cannot send message: Socket not connected");
        // Optional: Queue message?
    }
  }

  onNewMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  offNewMessage() {
      if (this.socket) {
          this.socket.off('newMessage');
      }
  }
}

export const socketService = new SocketService();
