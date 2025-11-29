import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket | null {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        console.log('⚠️ No access token found - socket will not connect');
        return null;
      }

      this.socket = io(import.meta.env.VITE_SOCKET_URL, {  // استخدم VITE_SOCKET_URL وليس VITE_API_URL
        auth: {
          token
        },
        transports: ['websocket'],   // استخدم websocket فقط لتجنب المشاكل
        secure: true,                // تأكيد استخدام WSS
        withCredentials: true        // للسماح بالكعكات إذا موجودة
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server via WebSocket');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      return this.socket;

    } catch (error) {
      console.error('❌ Socket initialization error:', error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ==================== دوال التعليقات ====================
  joinVideoRoom(videoId: number) {
    if (this.socket) {
      this.socket.emit('join_video', videoId);
    }
  }

  leaveVideoRoom(videoId: number) {
    if (this.socket) {
      this.socket.emit('leave_video', videoId);
    }
  }

  sendComment(videoId: number, comment: any) {
    if (this.socket) {
      this.socket.emit('new_comment', { videoId, comment });
    }
  }

  onNewComment(callback: (comment: any) => void) {
    if (this.socket) {
      this.socket.on('new_comment', callback);
    }
  }

  onCommentDeleted(callback: (data: { commentId: number; videoId: number }) => void) {
    if (this.socket) {
      this.socket.on('comment_deleted', callback);
    }
  }

  offNewComment() {
    if (this.socket) {
      this.socket.off('new_comment');
    }
  }

  offCommentDeleted() {
    if (this.socket) {
      this.socket.off('comment_deleted');
    }
  }
}

export const socketService = new SocketService();
