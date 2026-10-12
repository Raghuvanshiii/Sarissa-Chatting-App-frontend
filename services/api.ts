import axios, { AxiosError } from 'axios';
import { getStoredToken } from '../utils/tokenStorage';
import { 
  ServerHealthResponse, 
  User, 
  Conversation, 
  Message, 
  Attachment,
  Story,
  UserStoryGroup,
  CreateStoryData,
  StoryViewer
} from '../types';
import type { CallHistoryEntry } from '../store/useAppStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for centralized error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const customMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(customMessage));
  }
);

export interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
}

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ResetPasswordPayload {
  identifier: string;
  newPassword: string;
  confirmNewPassword: string;
}


export interface DirectConversationResponse {
  success: boolean;
  isNew: boolean;
  conversation: Conversation;
}

export const apiService = {
  // System Health
  getHealth: async (): Promise<ServerHealthResponse> => {
    const res = await apiClient.get<ServerHealthResponse>('/health');
    return res.data;
  },

  // Auth Endpoints
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', payload);
    return res.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', payload);
    return res.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    return res.data;
  },

  getMe: async (): Promise<{ success: boolean; user: User }> => {
    const res = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return res.data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.put<{ success: boolean; message: string }>('/auth/change-password', payload);
    return res.data;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', payload);
    return res.data;
  },


  // User Profile Endpoints
  updateProfile: async (payload: UpdateProfilePayload): Promise<{ success: boolean; message: string; user: User }> => {
    const res = await apiClient.put<{ success: boolean; message: string; user: User }>('/users/profile', payload);
    return res.data;
  },

  deleteAccount: async (password?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>('/users/account', {
      data: password ? { password } : {},
    });
    return res.data;
  },

  getUserById: async (id: string): Promise<{ success: boolean; user: User }> => {
    const res = await apiClient.get<{ success: boolean; user: User }>(`/users/${id}`);
    return res.data;
  },

  // Phase 3: Search & Conversations
  searchUsers: async (query = ''): Promise<{ success: boolean; count: number; users: User[] }> => {
    const res = await apiClient.get<{ success: boolean; count: number; users: User[] }>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return res.data;
  },

  getConversations: async (): Promise<{ success: boolean; count: number; conversations: Conversation[] }> => {
    const res = await apiClient.get<{ success: boolean; count: number; conversations: Conversation[] }>(
      '/conversations'
    );
    return res.data;
  },

  getOrCreateDirectConversation: async (recipientId: string): Promise<DirectConversationResponse> => {
    const res = await apiClient.post<DirectConversationResponse>('/conversations/direct', { recipientId });
    return res.data;
  },

  createGroup: async (payload: {
    name: string;
    participantIds: string[];
    avatar?: string;
    description?: string;
  }): Promise<{ success: boolean; conversation: Conversation }> => {
    const res = await apiClient.post<{ success: boolean; conversation: Conversation }>(
      '/conversations/group',
      payload
    );
    return res.data;
  },

  updateGroup: async (
    id: string,
    payload: { name?: string; description?: string; avatar?: string }
  ): Promise<{ success: boolean; conversation: Conversation }> => {
    const res = await apiClient.patch<{ success: boolean; conversation: Conversation }>(
      `/conversations/${id}`,
      payload
    );
    return res.data;
  },

  addGroupMembers: async (
    id: string,
    participantIds: string[]
  ): Promise<{ success: boolean; message: string; conversation: Conversation }> => {
    const res = await apiClient.post<{ success: boolean; message: string; conversation: Conversation }>(
      `/conversations/${id}/participants`,
      { participantIds }
    );
    return res.data;
  },

  removeGroupMember: async (
    id: string,
    userId: string
  ): Promise<{ success: boolean; message: string; conversation: Conversation }> => {
    const res = await apiClient.delete<{ success: boolean; message: string; conversation: Conversation }>(
      `/conversations/${id}/participants/${userId}`
    );
    return res.data;
  },

  getConversationById: async (id: string): Promise<{ success: boolean; conversation: Conversation }> => {
    const res = await apiClient.get<{ success: boolean; conversation: Conversation }>(`/conversations/${id}`);
    return res.data;
  },

  setDisappearingTimer: async (
    id: string,
    timer: 'off' | '24h' | '7d' | '90d'
  ): Promise<{ success: boolean; message: string; conversation: Conversation }> => {
    const res = await apiClient.patch<{ success: boolean; message: string; conversation: Conversation }>(
      `/conversations/${id}/disappearing-timer`,
      { timer }
    );
    return res.data;
  },

  sendMessage: async (payload: {
    conversationId: string;
    content?: string;
    messageType?: string;
    replyTo?: string;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; message: Message }> => {
    const res = await apiClient.post<{ success: boolean; message: Message }>('/messages', payload);
    return res.data;
  },

  getConversationMessages: async (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{
    success: boolean;
    count: number;
    totalCount: number;
    page: number;
    hasMore: boolean;
    messages: Message[];
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      totalCount: number;
      page: number;
      hasMore: boolean;
      messages: Message[];
    }>(`/messages/${conversationId}?page=${page}&limit=${limit}`);
    return res.data;
  },

  getCallHistory: async (): Promise<{ success: boolean; calls: CallHistoryEntry[] }> => {
    const res = await apiClient.get<{ success: boolean; calls: CallHistoryEntry[] }>('/messages/calls');
    return res.data;
  },

  // Phase 5: Presence Batch
  getUserPresences: async (
    userIds: string[]
  ): Promise<{
    success: boolean;
    presences: Record<string, { status: 'online' | 'offline' | 'away'; lastSeen: string }>;
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      presences: Record<string, { status: 'online' | 'offline' | 'away'; lastSeen: string }>;
    }>(`/users/presence?ids=${userIds.join(',')}`);
    return res.data;
  },

  // Phase 6: Read Receipts
  markConversationAsRead: async (
    conversationId: string
  ): Promise<{
    success: boolean;
    message: string;
    updatedCount: number;
  }> => {
    const res = await apiClient.put<{
      success: boolean;
      message: string;
      updatedCount: number;
    }>(`/messages/${conversationId}/read`);
    return res.data;
  },

  // Phase 7: Emoji Reactions
  toggleReaction: async (
    messageId: string,
    emoji: string
  ): Promise<{
    success: boolean;
    action: 'added' | 'removed';
    reactions: import('../types').Reaction[];
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      action: 'added' | 'removed';
      reactions: import('../types').Reaction[];
    }>(`/messages/${messageId}/reaction`, { emoji });
    return res.data;
  },

  deleteMessages: async (
    messageIds: string[],
    conversationId: string,
    deleteType: 'me' | 'everyone'
  ): Promise<{ success: boolean; deleteType: 'me' | 'everyone'; messageIds: string[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      deleteType: 'me' | 'everyone';
      messageIds: string[];
    }>('/messages/delete', { messageIds, conversationId, deleteType });
    return res.data;
  },

  // Phase 8: File & Media Uploads
  uploadSingle: async (
    file: File | Blob,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; attachment: Attachment }> => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      formData.append('file', file, 'avatar.jpg');
    }

    const res = await apiClient.post<{ success: boolean; attachment: Attachment }>(
      '/uploads/single',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );
    return res.data;
  },

  uploadMultiple: async (
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; attachments: Attachment[]; attachment?: Attachment }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await apiClient.post<{
      success: boolean;
      attachments: Attachment[];
      attachment?: Attachment;
    }>('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  deleteUpload: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/uploads/${filename}`);
    return res.data;
  },

  // Stories Feature API
  getActiveStories: async (): Promise<{
    success: boolean;
    data: { myStories: Story[]; otherStories: UserStoryGroup[] };
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { myStories: Story[]; otherStories: UserStoryGroup[] };
    }>('/stories');
    return res.data;
  },

  createStory: async (
    data: CreateStoryData
  ): Promise<{ success: boolean; data: Story; message: string }> => {
    const res = await apiClient.post<{ success: boolean; data: Story; message: string }>(
      '/stories',
      data
    );
    return res.data;
  },

  viewStory: async (
    id: string
  ): Promise<{ success: boolean; viewersCount: number; message: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      viewersCount: number;
      message: string;
    }>(`/stories/${id}/view`);
    return res.data;
  },

  getStoryViewers: async (
    id: string
  ): Promise<{
    success: boolean;
    data: { storyId: string; viewersCount: number; viewers: StoryViewer[] };
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { storyId: string; viewersCount: number; viewers: StoryViewer[] };
    }>(`/stories/${id}/viewers`);
    return res.data;
  },

  deleteStory: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/stories/${id}`);
    return res.data;
  },
};
