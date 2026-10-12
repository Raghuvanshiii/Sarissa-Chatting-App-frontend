export type UserStatus = 'online' | 'offline' | 'away';

export interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  status: UserStatus;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  _id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatar?: string;
  participants: User[];
  admins: (string | User)[];
  lastMessage?: Message;
  lastMessageAt?: string;
  disappearingTimer?: 'off' | '24h' | '7d' | '90d';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'system';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type AttachmentResourceType = 'image' | 'video' | 'audio' | 'document' | 'raw';

export interface Attachment {
  url: string;
  publicId?: string;
  resourceType: AttachmentResourceType;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ReactionUser {
  _id: string;
  fullName: string;
  username?: string;
  avatar?: string;
  status?: UserStatus;
}

export interface Reaction {
  emoji: string;
  userId: string | ReactionUser | User;
  messageId?: string;
  createdAt?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User | string;
  content: string;
  messageType: MessageType;
  attachments?: Attachment[];
  replyTo?: string | Message;
  threadId?: string;
  reactions?: Reaction[];
  status: MessageDeliveryStatus;
  deliveredTo?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  isOptimistic?: boolean;
  expiresAt?: string;
}

export interface ServerHealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    api: string;
    database: string;
    socket: string;
  };
}

export type SocketConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export * from './story';
