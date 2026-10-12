import { io, Socket } from 'socket.io-client';
import { SocketConnectionState, Message, Attachment, Reaction } from '../types';
import { getStoredToken } from '../utils/tokenStorage';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private connectionState: SocketConnectionState = 'disconnected';
  private stateListeners: ((state: SocketConnectionState) => void)[] = [];
  private currentToken: string | null = null;
  private activeRooms: Set<string> = new Set();
  private eventHandlers: Map<string, Set<Function>> = new Map();

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  public onStateChange(listener: (state: SocketConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private setConnectionState(state: SocketConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  // Persistent event subscription registry
  private addEventListener(event: string, callback: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    const handlers = this.eventHandlers.get(event)!;
    handlers.add(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    return () => {
      handlers.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    };
  }

  public connect(token?: string): Socket {
    const activeToken = token || getStoredToken();

    if (this.socket && this.socket.connected && this.currentToken === activeToken) {
      return this.socket;
    }

    // If already connected with different token, disconnect and reconnect with new credentials
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = activeToken;

    this.socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: activeToken || undefined,
      },
    });

    this.setupListeners();
    this.setConnectionState('connecting');
    this.socket.connect();
    return this.socket;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.setConnectionState('connected');
      // Automatically re-join all active rooms on every connect / reconnect!
      this.activeRooms.forEach((conversationId) => {
        this.socket?.emit('conversation:join', conversationId);
      });
    });

    // Re-attach all registered listeners to this socket instance
    for (const [event, handlers] of this.eventHandlers.entries()) {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler as any);
      });
    }

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
      this.setConnectionState('disconnected');
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.setConnectionState('reconnecting');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.setConnectionState('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.setConnectionState('disconnected');
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionState('disconnected');
    }
  }

  public joinConversation(conversationId: string): Promise<boolean> {
    if (conversationId) {
      this.activeRooms.add(conversationId);
    }
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        // Will be joined as soon as socket connects!
        resolve(true);
        return;
      }
      this.socket.emit('conversation:join', conversationId, (ack: { success: boolean }) => {
        resolve(ack?.success || false);
      });
    });
  }

  public leaveConversation(conversationId: string): void {
    if (conversationId) {
      this.activeRooms.delete(conversationId);
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('conversation:leave', conversationId);
    }
  }

  public sendMessage(data: {
    conversationId: string;
    content?: string;
    messageType?: string;
    replyTo?: string;
    attachments?: Attachment[];
  }): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket disconnected'));
        return;
      }

      this.socket.emit('message:send', data, (response: { success: boolean; message?: Message; message_error?: string }) => {
        if (response && response.success && response.message) {
          resolve(response.message);
        } else {
          reject(new Error((response as { message?: string })?.message || 'Failed to send message'));
        }
      });
    });
  }

  public onNewMessage(callback: (message: Message) => void): () => void {
    return this.addEventListener('message:new', callback);
  }

  // Phase 5: Typing Indicators
  public sendTypingStart(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  public sendTypingStop(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  public onTypingStarted(
    callback: (data: { conversationId: string; userId: string; username?: string }) => void
  ): () => void {
    return this.addEventListener('typing:user_started', callback);
  }

  public onTypingStopped(
    callback: (data: { conversationId: string; userId: string }) => void
  ): () => void {
    return this.addEventListener('typing:user_stopped', callback);
  }

  // Phase 5: Presence Tracking
  public onUserOnline(
    callback: (data: { userId: string; username?: string; status: 'online' | 'away' | 'offline'; lastSeen: string }) => void
  ): () => void {
    return this.addEventListener('user:online', callback);
  }

  public onUserOffline(
    callback: (data: { userId: string; username?: string; status: 'offline'; lastSeen: string }) => void
  ): () => void {
    return this.addEventListener('user:offline', callback);
  }

  public onPresenceUpdate(
    callback: (data: { userId: string; username?: string; status: 'online' | 'away' | 'offline'; lastSeen: string }) => void
  ): () => void {
    return this.addEventListener('presence:update', callback);
  }

  public syncPresence(): Promise<Record<string, { status: 'online' | 'away' | 'offline'; lastSeen: string }>> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({});
        return;
      }

      this.socket.emit('presence:sync', (response: { success: boolean; presences?: Record<string, { status: 'online' | 'away' | 'offline'; lastSeen: string }> }) => {
        if (response && response.success && response.presences) {
          resolve(response.presences);
        } else {
          resolve({});
        }
      });
    });
  }

  public setPresence(status: 'online' | 'away' | 'offline'): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }

      this.socket.emit('presence:set', status, (response: { success: boolean }) => {
        resolve(response?.success || false);
      });
    });
  }

  // Phase 6: Delivery & Read Receipts
  public sendDeliveryReceipt(conversationId: string, messageId: string | string[]): void {
    if (!this.socket || !this.socket.connected) return;
    if (Array.isArray(messageId)) {
      this.socket.emit('message:delivered', { conversationId, messageIds: messageId });
    } else {
      this.socket.emit('message:delivered', { conversationId, messageId });
    }
  }

  public sendReadReceipt(conversationId: string, messageIds?: string[]): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('message:read', { conversationId, messageIds });
  }

  public onMessageStatusUpdated(
    callback: (data: {
      conversationId: string;
      messageIds: string[];
      status: 'delivered' | 'read';
      userId: string;
    }) => void
  ): () => void {
    return this.addEventListener('message:status_updated', callback);
  }

  public onMessageReadReceipt(
    callback: (data: {
      conversationId: string;
      readerId: string;
      readAt: string;
      messageIds?: string[];
      updatedCount?: number;
    }) => void
  ): () => void {
    return this.addEventListener('message:read_receipt', callback);
  }

  // Phase 7: Emoji Reactions
  public toggleReaction(
    messageId: string,
    conversationId: string,
    emoji: string
  ): Promise<{ success: boolean; action?: 'added' | 'removed'; reactions?: Reaction[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket.emit(
        'message:reaction',
        { messageId, conversationId, emoji },
        (response: { success: boolean; action?: 'added' | 'removed'; reactions?: Reaction[] }) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error((response as { message?: string })?.message || 'Reaction toggle failed'));
          }
        }
      );
    });
  }

  public onReactionUpdated(
    callback: (data: {
      messageId: string;
      conversationId: string;
      reactions: Reaction[];
      userId: string;
      emoji: string;
      action: 'added' | 'removed';
    }) => void
  ): () => void {
    return this.addEventListener('message:reaction_updated', callback);
  }

  // Message Deletion
  public deleteMessages(
    messageIds: string[],
    conversationId: string,
    deleteType: 'me' | 'everyone'
  ): Promise<{ success: boolean; deleteType: 'me' | 'everyone'; messageIds: string[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket.emit(
        'message:delete',
        { messageIds, conversationId, deleteType },
        (response: { success: boolean; deleteType: 'me' | 'everyone'; messageIds: string[]; message?: string }) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.message || 'Delete failed'));
          }
        }
      );
    });
  }

  public onMessageDeleted(
    callback: (data: {
      messageIds: string[];
      conversationId: string;
      deleteType: 'me' | 'everyone';
      deletedBy?: string;
      deletedForUserId?: string;
    }) => void
  ): () => void {
    return this.addEventListener('message:deleted', callback);
  }

  public onUserProfileUpdated(callback: (data: { user: any }) => void): () => void {
    return this.addEventListener('user:profile_updated', callback);
  }

  public ping(data: unknown = { ping: Date.now() }): Promise<{ latency: number; response: unknown }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket is not connected'));
      }

      const start = Date.now();
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.emit('ping:client', data, (response: unknown) => {
        clearTimeout(timeout);
        const latency = Date.now() - start;
        resolve({ latency, response });
      });
    });
  }

  // ---------------------------------------------------------
  // Audio & Video Call Methods (WhatsApp Calling)
  // ---------------------------------------------------------
  public initiateCall(data: {
    conversationId: string;
    receiverId?: string;
    callType: 'audio' | 'video';
    callerName?: string;
    callerAvatar?: string;
    isGroup?: boolean;
    groupName?: string;
  }): Promise<{ success: boolean; callId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket is not connected'));
      }
      this.socket.emit('call:initiate', data, (res: { success: boolean; callId?: string; message?: string }) => {
        if (res && res.success && res.callId) {
          resolve({ success: true, callId: res.callId });
        } else {
          reject(new Error(res?.message || 'Failed to initiate call'));
        }
      });
    });
  }

  public acceptCall(data: { callId: string; callerId: string; conversationId: string }): void {
    this.socket?.emit('call:accept', data);
  }

  public rejectCall(data: { callId: string; callerId: string; reason?: string }): void {
    this.socket?.emit('call:reject', data);
  }

  public endCall(data: { callId: string; partnerId?: string; conversationId?: string; duration?: number }): void {
    this.socket?.emit('call:end', data);
  }

  public sendCallSignal(data: { to: string; signal: unknown; callId: string }): void {
    this.socket?.emit('call:signal', data);
  }

  public onIncomingCall(
    callback: (data: {
      callId: string;
      conversationId: string;
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      callType: 'audio' | 'video';
      isGroup?: boolean;
      groupName?: string;
    }) => void
  ): () => void {
    return this.addEventListener('call:incoming', callback);
  }

  public onCallAccepted(
    callback: (data: { callId: string; receiverId: string }) => void
  ): () => void {
    return this.addEventListener('call:accepted', callback);
  }

  public onCallRejected(
    callback: (data: { callId: string; receiverId: string; reason?: string }) => void
  ): () => void {
    return this.addEventListener('call:rejected', callback);
  }

  public onCallEnded(
    callback: (data: { callId: string; endedBy: string; duration?: number }) => void
  ): () => void {
    return this.addEventListener('call:ended', callback);
  }

  public onCallSignal(
    callback: (data: { from: string; signal: unknown; callId: string }) => void
  ): () => void {
    return this.addEventListener('call:signal', callback);
  }

  // ---------------------------------------------------------
  // Conversation Management Methods
  // ---------------------------------------------------------
  public clearConversation(conversationId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket is not connected'));
      }
      this.socket.emit('conversation:clear', { conversationId }, (res: { success: boolean; message?: string }) => {
        if (res && res.success) {
          resolve(true);
        } else {
          reject(new Error(res?.message || 'Failed to clear conversation'));
        }
      });
    });
  }

  public onConversationCleared(
    callback: (data: { conversationId: string; clearedBy: string }) => void
  ): () => void {
    return this.addEventListener('conversation:cleared', callback);
  }

  public setDisappearingTimer(data: {
    conversationId: string;
    timer: 'off' | '24h' | '7d' | '90d';
    content?: string;
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket is not connected'));
      }
      this.socket.emit(
        'conversation:set_disappearing_timer',
        data,
        (res: { success: boolean; message?: string }) => {
          if (res && res.success) {
            resolve(true);
          } else {
            reject(new Error(res?.message || 'Failed to update disappearing timer'));
          }
        }
      );
    });
  }

  public onDisappearingTimerUpdated(
    callback: (data: { conversationId: string; timer: 'off' | '24h' | '7d' | '90d'; updatedBy: string }) => void
  ): () => void {
    return this.addEventListener('conversation:disappearing_timer_updated', callback);
  }

  // ---------------------------------------------------------
  // Interactive Poll Voting
  // ---------------------------------------------------------
  public votePoll(data: {
    messageId: string;
    conversationId: string;
    optionId: string;
  }): Promise<{ success: boolean; pollData?: any }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        return reject(new Error('Socket is not connected'));
      }
      this.socket.emit('poll:vote', data, (res: { success: boolean; pollData?: any; message?: string }) => {
        if (res && res.success) {
          resolve(res);
        } else {
          reject(new Error(res?.message || 'Failed to submit vote'));
        }
      });
    });
  }

  public onPollUpdated(
    callback: (data: { messageId: string; conversationId: string; pollData: any; content: string }) => void
  ): () => void {
    return this.addEventListener('poll:updated', callback);
  }

  public onConversationCreated(callback: (conversation: any) => void): () => void {
    return this.addEventListener('conversation:created', callback);
  }

  public onConversationUpdated(callback: (conversation: any) => void): () => void {
    return this.addEventListener('conversation:updated', callback);
  }

  public onConversationRemoved(callback: (data: { conversationId: string }) => void): () => void {
    return this.addEventListener('conversation:removed', callback);
  }

  // ---------------------------------------------------------
  // Stories / Status Real-time Channels
  // ---------------------------------------------------------
  public onStoryCreated(callback: (data: { story: any }) => void): () => void {
    return this.addEventListener('story:created', callback);
  }

  public onStoryViewed(callback: (data: any) => void): () => void {
    return this.addEventListener('story:viewed', callback);
  }

  public onStoryDeleted(callback: (data: { storyId: string; authorId: string }) => void): () => void {
    return this.addEventListener('story:deleted', callback);
  }
}

export const socketService = new SocketService();
