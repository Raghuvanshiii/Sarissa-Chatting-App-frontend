import { create } from 'zustand';
import { Conversation, User, Message, UserStatus, MessageDeliveryStatus, Reaction, Attachment } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { useAuthStore } from './useAuthStore';
import { useWallpaperStore } from './useWallpaperStore';

export interface TypingUser {
  userId: string;
  username?: string;
  fullName?: string;
}

export interface PresenceInfo {
  status: UserStatus;
  lastSeen?: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoadingConversations: boolean;
  searchResults: User[];
  isSearching: boolean;
  searchQuery: string;
  isNewChatModalOpen: boolean;
  isCreateGroupModalOpen: boolean;
  error: string | null;

  // Phase 4: Messages State
  messages: Record<string, Message[]>;
  isLoadingMessages: boolean;

  // Phase 5: Presence & Typing Indicators
  typingUsers: Record<string, TypingUser[]>;
  presences: Record<string, PresenceInfo>;

  // Phase 7: Thread Replies & Quoted Messages
  replyingTo: Message | null;

  // Phase 8: Attachments State
  pendingAttachments: Attachment[];
  isUploadingAttachment: boolean;
  uploadProgress: number;

  // Actions
  fetchConversations: () => Promise<void>;
  startDirectChat: (recipientId: string) => Promise<Conversation | null>;
  createGroup: (payload: { name: string; participantIds: string[]; avatar?: string; description?: string }) => Promise<Conversation | null>;
  handleConversationCreated: (conversation: Conversation) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  searchUsers: (query: string) => Promise<void>;
  openNewChatModal: () => void;
  closeNewChatModal: () => void;
  openCreateGroupModal: () => void;
  closeCreateGroupModal: () => void;
  isGroupInfoDrawerOpen: boolean;
  openGroupInfoDrawer: () => void;
  closeGroupInfoDrawer: () => void;
  updateGroupInfo: (
    conversationId: string,
    payload: { name?: string; description?: string; avatar?: string }
  ) => Promise<Conversation | null>;
  addGroupMembers: (conversationId: string, participantIds: string[]) => Promise<boolean>;
  removeGroupMember: (conversationId: string, userId: string) => Promise<boolean>;
  handleConversationUpdated: (conversation: Conversation) => void;
  handleConversationRemoved: (conversationId: string) => void;
  setDisappearingTimer: (conversationId: string, timer: 'off' | '24h' | '7d' | '90d') => Promise<boolean>;
  handleDisappearingTimerUpdated: (conversationId: string, timer: 'off' | '24h' | '7d' | '90d') => void;
  handleUserUpdated: (updatedUser: Partial<User> & { _id: string }) => void;
  clearSearchResults: () => void;

  // Message Actions
  fetchMessages: (conversationId: string) => Promise<void>;
  sendChatMessage: (content?: string, replyTo?: string) => Promise<boolean>;
  receiveMessage: (message: Message) => void;

  // Phase 5 Actions
  setUserTyping: (conversationId: string, user: TypingUser, isTyping: boolean) => void;
  setUserPresence: (userId: string, status: UserStatus, lastSeen?: string) => void;
  syncPresences: () => Promise<void>;
  getParticipantPresence: (userId: string, defaultStatus?: UserStatus) => PresenceInfo;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;

  // Phase 6 Actions: Status & Receipts
  markConversationAsRead: (conversationId: string) => Promise<void>;
  updateMessageStatus: (conversationId: string, messageIds: string[], status: MessageDeliveryStatus) => void;
  handleReadReceipt: (conversationId: string, readerId: string, messageIds?: string[]) => void;

  // Phase 7 Actions: Reactions & Replies
  setReplyingTo: (message: Message | null) => void;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  updateMessageReactions: (conversationId: string, messageId: string, reactions: Reaction[]) => void;
  updateMessageContent: (conversationId: string, messageId: string, content: string) => void;
  deleteMessages: (messageIds: string[], deleteType: 'me' | 'everyone') => Promise<void>;
  handleMessagesDeleted: (
    conversationId: string,
    messageIds: string[],
    deleteType?: 'me' | 'everyone',
    deletedForUserId?: string
  ) => void;

  // Phase 8 Actions: Attachments
  addPendingAttachment: (attachment: Attachment) => void;
  removePendingAttachment: (index: number) => void;
  clearPendingAttachments: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
  sendDirectMedia: (file: File, textContent?: string) => Promise<boolean>;
  clearLocalMessages: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  isLoadingConversations: false,
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  isNewChatModalOpen: false,
  isCreateGroupModalOpen: false,
  isGroupInfoDrawerOpen: false,
  error: null,

  messages: {},
  isLoadingMessages: false,

  typingUsers: {},
  presences: {},
  replyingTo: null,
  pendingAttachments: [],
  isUploadingAttachment: false,
  uploadProgress: 0,

  openNewChatModal: () => {
    set({ isNewChatModalOpen: true, error: null });
    get().searchUsers('');
  },

  closeNewChatModal: () =>
    set({ isNewChatModalOpen: false, searchResults: [], searchQuery: '', error: null }),

  openCreateGroupModal: () => {
    set({ isCreateGroupModalOpen: true, isNewChatModalOpen: false, error: null });
    get().searchUsers('');
  },

  closeCreateGroupModal: () =>
    set({ isCreateGroupModalOpen: false, error: null }),

  openGroupInfoDrawer: () => set({ isGroupInfoDrawerOpen: true }),
  closeGroupInfoDrawer: () => set({ isGroupInfoDrawerOpen: false }),

  clearSearchResults: () => set({ searchResults: [], searchQuery: '' }),

  setReplyingTo: (message) => set({ replyingTo: message }),

  setActiveConversation: (conversation) => {
    const previous = get().activeConversation;
    if (previous && previous._id !== conversation?._id) {
      socketService.leaveConversation(previous._id);
      socketService.sendTypingStop(previous._id);
    }

    set((state) => ({
      activeConversation: conversation,
      replyingTo: null,
      pendingAttachments: [],
      conversations: conversation
        ? state.conversations.map((c) =>
            c._id === conversation._id ? { ...c, unreadCount: 0 } : c
          )
        : state.conversations,
    }));

    if (conversation) {
      socketService.joinConversation(conversation._id);
      get().fetchMessages(conversation._id);
      get().markConversationAsRead(conversation._id);
    }

    useWallpaperStore.getState().setActiveContext(useAuthStore.getState().user?._id || null, conversation?._id || null);
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const res = await apiService.getConversations();

      const initialPresences: Record<string, PresenceInfo> = { ...get().presences };
      res.conversations.forEach((conv) => {
        conv.participants?.forEach((p) => {
          if (typeof p === 'object' && p._id) {
            if (!initialPresences[p._id]) {
              initialPresences[p._id] = {
                status: p.status || 'offline',
                lastSeen: p.lastSeen,
              };
            }
          }
        });
      });

      set({
        conversations: res.conversations,
        presences: initialPresences,
        isLoadingConversations: false,
        activeConversation: get().activeConversation
          ? res.conversations.find((c) => c._id === get().activeConversation?._id) ||
            get().activeConversation
          : get().activeConversation,
      });

      get().syncPresences();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
      set({ error: msg, isLoadingConversations: false });
    }
  },

  startDirectChat: async (recipientId: string) => {
    set({ error: null });
    try {
      const res = await apiService.getOrCreateDirectConversation(recipientId);
      const conversation = res.conversation;

      set((state) => {
        const exists = state.conversations.some((c) => c._id === conversation._id);
        const updatedList = exists
          ? [conversation, ...state.conversations.filter((c) => c._id !== conversation._id)]
          : [conversation, ...state.conversations];
        return {
          conversations: updatedList,
          isNewChatModalOpen: false,
        };
      });

      get().setActiveConversation(conversation);
      return conversation;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start conversation';
      set({ error: msg });
      return null;
    }
  },

  createGroup: async (payload: { name: string; participantIds: string[]; avatar?: string; description?: string }) => {
    set({ error: null });
    try {
      const res = await apiService.createGroup(payload);
      const conversation = res.conversation;

      set((state) => {
        const exists = state.conversations.some((c) => c._id === conversation._id);
        const updatedList = exists
          ? [conversation, ...state.conversations.filter((c) => c._id !== conversation._id)]
          : [conversation, ...state.conversations];
        return {
          conversations: updatedList,
          isCreateGroupModalOpen: false,
        };
      });

      get().setActiveConversation(conversation);
      return conversation;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      set({ error: msg });
      return null;
    }
  },

  handleConversationCreated: (conversation: Conversation) => {
    set((state) => {
      const exists = state.conversations.some((c) => c._id === conversation._id);
      if (exists) return state;
      return {
        conversations: [conversation, ...state.conversations],
      };
    });
  },

  updateGroupInfo: async (conversationId, payload) => {
    try {
      const res = await apiService.updateGroup(conversationId, payload);
      get().handleConversationUpdated(res.conversation);
      return res.conversation;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update group';
      set({ error: msg });
      return null;
    }
  },

  addGroupMembers: async (conversationId, participantIds) => {
    try {
      const res = await apiService.addGroupMembers(conversationId, participantIds);
      get().handleConversationUpdated(res.conversation);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add members';
      set({ error: msg });
      return false;
    }
  },

  removeGroupMember: async (conversationId, userId) => {
    try {
      const res = await apiService.removeGroupMember(conversationId, userId);
      const currentAuthUser = useAuthStore.getState().user;
      const isSelf = currentAuthUser?._id === userId;

      if (isSelf) {
        get().handleConversationRemoved(conversationId);
      } else {
        get().handleConversationUpdated(res.conversation);
      }
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to remove member');
      set({ error: msg });
      return false;
    }
  },

  handleConversationUpdated: (updatedConversation: Conversation) => {
    set((state) => {
      const updatedList = state.conversations.map((c) =>
        c._id === updatedConversation._id ? { ...c, ...updatedConversation } : c
      );
      const updatedActive =
        state.activeConversation?._id === updatedConversation._id
          ? { ...state.activeConversation, ...updatedConversation }
          : state.activeConversation;
      return {
        conversations: updatedList,
        activeConversation: updatedActive,
      };
    });
  },

  setDisappearingTimer: async (conversationId: string, timer: 'off' | '24h' | '7d' | '90d') => {
    // Optimistic update
    set((state) => {
      const updatedList = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, disappearingTimer: timer } : c
      );
      const updatedActive =
        state.activeConversation?._id === conversationId
          ? { ...state.activeConversation, disappearingTimer: timer }
          : state.activeConversation;
      return {
        conversations: updatedList,
        activeConversation: updatedActive,
      };
    });

    const durationLabel =
      timer === '24h' ? '24 hours' : timer === '7d' ? '7 days' : timer === '90d' ? '90 days' : '';
    const systemText =
      timer === 'off'
        ? 'You turned off disappearing messages. Change timer.'
        : `You turned on disappearing messages. New messages will disappear from this chat ${durationLabel} after they're sent, except when kept. Change timer.`;

    try {
      await socketService.setDisappearingTimer({
        conversationId,
        timer,
        content: systemText,
      });
      return true;
    } catch {
      try {
        const res = await apiService.setDisappearingTimer(conversationId, timer);
        if (res.conversation) {
          get().handleConversationUpdated(res.conversation);
        }
        return true;
      } catch (err) {
        console.error('Failed to set disappearing timer:', err);
        return false;
      }
    }
  },

  handleDisappearingTimerUpdated: (conversationId: string, timer: 'off' | '24h' | '7d' | '90d') => {
    set((state) => {
      const updatedList = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, disappearingTimer: timer } : c
      );
      const updatedActive =
        state.activeConversation?._id === conversationId
          ? { ...state.activeConversation, disappearingTimer: timer }
          : state.activeConversation;
      return {
        conversations: updatedList,
        activeConversation: updatedActive,
      };
    });
  },

  handleConversationRemoved: (conversationId: string) => {
    socketService.leaveConversation(conversationId);
    set((state) => {
      const filtered = state.conversations.filter((c) => c._id !== conversationId);
      const newActive =
        state.activeConversation?._id === conversationId ? null : state.activeConversation;
      return {
        conversations: filtered,
        activeConversation: newActive,
        isGroupInfoDrawerOpen:
          state.activeConversation?._id === conversationId ? false : state.isGroupInfoDrawerOpen,
      };
    });
  },

  handleUserUpdated: (updatedUser: Partial<User> & { _id: string }) => {
    set((state) => {
      const targetId = String(updatedUser._id);
      const updatedConversations = state.conversations.map((conv) => {
        const hasParticipant = conv.participants?.some((p) => {
          const pid = typeof p === 'object' && p !== null ? String(p._id) : String(p);
          return pid === targetId;
        });
        if (!hasParticipant) return conv;
        return {
          ...conv,
          participants: conv.participants.map((p) => {
            if (typeof p === 'object' && p !== null && String(p._id) === targetId) {
              return { ...p, ...updatedUser };
            }
            return p;
          }),
        };
      });

      let updatedActive = state.activeConversation;
      if (updatedActive) {
        const hasParticipant = updatedActive.participants?.some((p) => {
          const pid = typeof p === 'object' && p !== null ? String(p._id) : String(p);
          return pid === targetId;
        });
        if (hasParticipant) {
          updatedActive = {
            ...updatedActive,
            participants: updatedActive.participants.map((p) => {
              if (typeof p === 'object' && p !== null && String(p._id) === targetId) {
                return { ...p, ...updatedUser };
              }
              return p;
            }),
          };
        }
      }

      return {
        conversations: updatedConversations,
        activeConversation: updatedActive,
      };
    });
  },

  searchUsers: async (query: string) => {
    set({ isSearching: true, searchQuery: query, error: null });
    try {
      const res = await apiService.searchUsers(query);
      set({ searchResults: res.users, isSearching: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      set({ error: msg, isSearching: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    try {
      const res = await apiService.getConversationMessages(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: res.messages,
        },
        isLoadingMessages: false,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
      set({ error: msg, isLoadingMessages: false });
    }
  },

  sendChatMessage: async (content?: string, replyTo?: string) => {
    const activeConv = get().activeConversation;
    const attachmentsToSend = [...get().pendingAttachments];
    const trimmedContent = (content || '').trim();

    if (!activeConv || (!trimmedContent && attachmentsToSend.length === 0)) return false;

    const conversationId = activeConv._id;
    const targetReplyTo = replyTo || get().replyingTo?._id;

    // Infer messageType from attachments
    let resolvedMessageType = 'text';
    if (attachmentsToSend.length > 0) {
      const firstType = attachmentsToSend[0].resourceType;
      if (firstType === 'image') resolvedMessageType = 'image';
      else if (firstType === 'video') resolvedMessageType = 'video';
      else if (firstType === 'audio') resolvedMessageType = 'audio';
      else resolvedMessageType = 'document';
    }

    // Clear replying state and pending attachments immediately
    set({ replyingTo: null, pendingAttachments: [] });

    // Stop typing immediately when sending
    get().sendTypingIndicator(conversationId, false);

    try {
      let message: Message | null = null;
      try {
        message = await socketService.sendMessage({
          conversationId,
          content: trimmedContent,
          messageType: resolvedMessageType,
          replyTo: targetReplyTo,
          attachments: attachmentsToSend,
        });
      } catch {
        const restRes = await apiService.sendMessage({
          conversationId,
          content: trimmedContent,
          messageType: resolvedMessageType,
          replyTo: targetReplyTo,
          attachments: attachmentsToSend,
        });
        message = restRes.message;
      }

      if (message) {
        get().receiveMessage(message);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      set({ error: msg });
      return false;
    }
  },

  receiveMessage: (message: Message) => {
    const convId = message.conversationId;
    const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
    const isActive = get().activeConversation?._id === convId;

    if (isActive) {
      socketService.sendDeliveryReceipt(convId, message._id);
      socketService.sendReadReceipt(convId, [message._id]);
      apiService.markConversationAsRead(convId).catch(() => {});
    } else {
      socketService.sendDeliveryReceipt(convId, message._id);
    }

    set((state) => {
      const currentList = state.messages[convId] || [];
      if (currentList.some((m) => m._id === message._id)) {
        return state;
      }

      const updatedMessages = [...currentList, message];

      const updatedConversations = state.conversations.map((c) => {
        if (c._id === convId) {
          const unreadCount = isActive ? 0 : (c.unreadCount || 0) + 1;
          return {
            ...c,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount,
          };
        }
        return c;
      });

      updatedConversations.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.updatedAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.updatedAt).getTime();
        return timeB - timeA;
      });

      const currentTyping = state.typingUsers[convId] || [];
      const updatedTyping = currentTyping.filter((u) => u.userId !== senderId);

      const updatedPresences = { ...state.presences };
      if (senderId) {
        updatedPresences[senderId] = {
          status: 'online',
          lastSeen: message.createdAt || new Date().toISOString(),
        };
      }

      return {
        messages: {
          ...state.messages,
          [convId]: updatedMessages,
        },
        conversations: updatedConversations,
        typingUsers: {
          ...state.typingUsers,
          [convId]: updatedTyping,
        },
        presences: updatedPresences,
      };
    });
  },

  setUserTyping: (conversationId, typingUser, isTyping) => {
    set((state) => {
      const currentList = state.typingUsers[conversationId] || [];
      if (isTyping) {
        if (currentList.some((u) => u.userId === typingUser.userId)) {
          return state;
        }
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...currentList, typingUser],
          },
        };
      } else {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: currentList.filter((u) => u.userId !== typingUser.userId),
          },
        };
      }
    });
  },

  setUserPresence: (userId, status, lastSeen) => {
    set((state) => ({
      presences: {
        ...state.presences,
        [userId]: {
          status,
          lastSeen: lastSeen || new Date().toISOString(),
        },
      },
    }));
  },

  syncPresences: async () => {
    try {
      const onlineMap = await socketService.syncPresence();
      const state = get();
      const allUserIds = new Set<string>();

      state.conversations.forEach((conv) => {
        conv.participants?.forEach((p) => {
          const uid = typeof p === 'object' ? p._id : p;
          if (uid) allUserIds.add(uid);
        });
      });

      let fullMap: Record<string, PresenceInfo> = {};
      for (const [uid, info] of Object.entries(onlineMap)) {
        fullMap[uid] = { status: info.status as UserStatus, lastSeen: info.lastSeen };
      }

      if (allUserIds.size > 0) {
        const batchRes = await apiService.getUserPresences(Array.from(allUserIds));
        if (batchRes.success && batchRes.presences) {
          fullMap = {
            ...(batchRes.presences as Record<string, PresenceInfo>),
            ...fullMap,
          };
        }
      }

      set((s) => ({
        presences: {
          ...s.presences,
          ...fullMap,
        },
      }));
    } catch {
      // Ignore
    }
  },

  getParticipantPresence: (userId, defaultStatus = 'offline') => {
    const p = get().presences[userId];
    if (p) return p;
    return { status: defaultStatus };
  },

  sendTypingIndicator: (conversationId, isTyping) => {
    if (isTyping) {
      socketService.sendTypingStart(conversationId);
    } else {
      socketService.sendTypingStop(conversationId);
    }
  },

  markConversationAsRead: async (conversationId: string) => {
    try {
      socketService.sendReadReceipt(conversationId);
      await apiService.markConversationAsRead(conversationId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {
      // Ignore
    }
  },

  updateMessageStatus: (conversationId, messageIds, status) => {
    set((state) => {
      const currentList = state.messages[conversationId] || [];
      const updatedMessages = currentList.map((m) => {
        if (messageIds.includes(m._id)) {
          return { ...m, status };
        }
        return m;
      });
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    });
  },

  handleReadReceipt: (conversationId, readerId, messageIds) => {
    set((state) => {
      const currentList = state.messages[conversationId] || [];
      const updatedMessages = currentList.map((m) => {
        const shouldMark = messageIds && messageIds.length > 0 ? messageIds.includes(m._id) : true;
        if (shouldMark) {
          const currentReadBy = (m.readBy || []).map((u) => (typeof u === 'object' ? (u as { _id: string })._id : u));
          return {
            ...m,
            status: 'read' as MessageDeliveryStatus,
            readBy: Array.from(new Set([...currentReadBy, readerId])),
          };
        }
        return m;
      });
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    });
  },

  // Phase 7 Actions: Reactions & Replies
  toggleReaction: async (messageId: string, emoji: string) => {
    const activeConv = get().activeConversation;
    if (!activeConv) return;
    const conversationId = activeConv._id;

    const currentMessages = get().messages[conversationId] || [];
    const targetMsg = currentMessages.find((m) => m._id === messageId);
    if (!targetMsg || targetMsg.deletedForEveryone) return;

    const currentUser = useAuthStore.getState().user;
    const currentUserId = currentUser?._id || '';
    const userPayload = currentUser
      ? {
          _id: currentUser._id,
          fullName: currentUser.fullName,
          username: currentUser.username,
          avatar: currentUser.avatar,
        }
      : currentUserId;
    const cleanEmoji = emoji.trim();
    const existingReactions = [...(targetMsg.reactions || [])];

    // Check if the current user already has any reaction on this message (single reaction rule)
    const existingIdx = existingReactions.findIndex((r) => {
      const rawId = r.userId;
      const uid =
        typeof rawId === 'object' && rawId !== null
          ? ((rawId as { _id?: string })._id || rawId).toString()
          : String(rawId || '');
      return uid === currentUserId;
    });

    let optimisticReactions: Reaction[];
    if (existingIdx > -1) {
      const existingReaction = existingReactions[existingIdx];
      if (existingReaction.emoji === cleanEmoji) {
        // 🚀 Optimistically REMOVE reaction (clicked same emoji)
        optimisticReactions = existingReactions.filter((_, idx) => idx !== existingIdx);
      } else {
        // 🚀 Optimistically REPLACE previous reaction with the new emoji
        const withoutPrevious = existingReactions.filter((_, idx) => idx !== existingIdx);
        optimisticReactions = [
          ...withoutPrevious,
          {
            emoji: cleanEmoji,
            userId: userPayload,
            messageId,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    } else {
      // 🚀 Optimistically ADD reaction (no prior reaction)
      optimisticReactions = [
        ...existingReactions,
        {
          emoji: cleanEmoji,
          userId: userPayload,
          messageId,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    // ⚡ INSTANT 0ms OPTIMISTIC UPDATE: Reflects on the UI immediately without waiting or refreshing!
    get().updateMessageReactions(conversationId, messageId, optimisticReactions);

    try {
      // Send over real-time WebSocket with acknowledgment
      const res = await socketService.toggleReaction(messageId, conversationId, cleanEmoji);
      if (res && res.reactions) {
        get().updateMessageReactions(conversationId, messageId, res.reactions);
      }
    } catch {
      // Fallback to REST API if socket fails or isn't connected
      try {
        const res = await apiService.toggleReaction(messageId, cleanEmoji);
        if (res && res.reactions) {
          get().updateMessageReactions(conversationId, messageId, res.reactions);
        }
      } catch (err) {
        // Rollback to original reactions on total failure
        get().updateMessageReactions(conversationId, messageId, existingReactions);
      }
    }
  },

  updateMessageReactions: (conversationId, messageId, reactions) => {
    set((state) => {
      const currentList = state.messages[conversationId] || [];
      const updatedMessages = currentList.map((m) => {
        if (m._id === messageId) {
          return {
            ...m,
            reactions: [...reactions],
          };
        }
        return m;
      });
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    });
  },

  updateMessageContent: (conversationId, messageId, content) => {
    set((state) => {
      const currentList = state.messages[conversationId] || [];
      const updatedMessages = currentList.map((m) => {
        if (m._id === messageId) {
          return {
            ...m,
            content,
          };
        }
        return m;
      });
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    });
  },

  handleMessagesDeleted: (
    conversationId: string,
    messageIds: string[],
    deleteType?: 'me' | 'everyone',
    deletedForUserId?: string
  ) => {
    const currentUserId = useAuthStore.getState().user?._id;

    // Strict Safety Guard for 'Delete for me': ONLY process if targeted for this active user
    if (deleteType === 'me') {
      const currentId = currentUserId ? String(currentUserId) : '';
      const targetId = deletedForUserId ? String(deletedForUserId) : '';
      if (!currentId || !targetId || currentId !== targetId) {
        return;
      }
    }

    set((state) => {
      const currentList = state.messages[conversationId] || [];

      let updatedMessages: Message[];
      if (deleteType === 'everyone') {
        // WhatsApp tombstone: keep message in timeline with deletedForEveryone = true
        updatedMessages = currentList.map((m) => {
          if (messageIds.includes(m._id)) {
            return {
              ...m,
              deletedForEveryone: true,
              deletedAt: new Date().toISOString(),
              content: '',
              attachments: [],
              reactions: [],
              replyTo: undefined,
            };
          }
          return m;
        });
      } else if (deleteType === 'me') {
        // Delete for me: remove completely from this user's view
        updatedMessages = currentList.filter((m) => !messageIds.includes(m._id));
      } else {
        updatedMessages = currentList;
      }

      // Also update conversations lastMessage preview if affected
      const updatedConversations = state.conversations.map((c) => {
        if (c._id === conversationId && c.lastMessage && messageIds.includes(c.lastMessage._id)) {
          if (deleteType === 'everyone') {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                deletedForEveryone: true,
                content: '',
              },
            };
          } else if (deleteType === 'me') {
            const remaining = updatedMessages.filter((m) => !m.deletedForEveryone);
            const prevMsg = remaining.length > 0 ? remaining[remaining.length - 1] : undefined;
            return {
              ...c,
              lastMessage: prevMsg,
            };
          }
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    });
  },

  deleteMessages: async (messageIds: string[], deleteType: 'me' | 'everyone') => {
    const activeConv = get().activeConversation;
    if (!activeConv || messageIds.length === 0) return;
    const conversationId = activeConv._id;
    const previousMessages = get().messages[conversationId] || [];
    const currentUserId = useAuthStore.getState().user?._id;

    // ⚡ 0ms Optimistic Update: instantly update view for current user
    get().handleMessagesDeleted(conversationId, messageIds, deleteType, currentUserId);

    // Call WebSocket / API
    try {
      await socketService.deleteMessages(messageIds, conversationId, deleteType);
    } catch {
      try {
        await apiService.deleteMessages(messageIds, conversationId, deleteType);
      } catch (err) {
        console.error('Failed to delete messages:', err);
        // Rollback optimistic removal if unauthorized or server error
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: previousMessages,
          },
        }));
      }
    }
  },

  // Phase 8 Actions: Attachments
  addPendingAttachment: (attachment) =>
    set((state) => ({ pendingAttachments: [...state.pendingAttachments, attachment] })),

  removePendingAttachment: (index) =>
    set((state) => {
      const updated = [...state.pendingAttachments];
      const removed = updated.splice(index, 1)[0];
      if (removed?.publicId) {
        apiService.deleteUpload(removed.publicId).catch(() => {});
      }
      return { pendingAttachments: updated };
    }),

  clearPendingAttachments: () => set({ pendingAttachments: [] }),

  uploadFiles: async (files: File[]) => {
    if (!files || files.length === 0) return;
    set({ isUploadingAttachment: true, uploadProgress: 0, error: null });

    try {
      if (files.length === 1) {
        const res = await apiService.uploadSingle(files[0], (percent) => {
          set({ uploadProgress: percent });
        });
        if (res.success && res.attachment) {
          set((state) => ({
            pendingAttachments: [...state.pendingAttachments, res.attachment],
            isUploadingAttachment: false,
            uploadProgress: 100,
          }));
        }
      } else {
        const res = await apiService.uploadMultiple(files, (percent) => {
          set({ uploadProgress: percent });
        });
        if (res.success && res.attachments) {
          set((state) => ({
            pendingAttachments: [...state.pendingAttachments, ...res.attachments],
            isUploadingAttachment: false,
            uploadProgress: 100,
          }));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload attachments';
      set({ error: msg, isUploadingAttachment: false, uploadProgress: 0 });
    }
  },

  sendDirectMedia: async (file: File, textContent?: string) => {
    const activeConv = get().activeConversation;
    if (!activeConv) return false;
    set({ isUploadingAttachment: true, uploadProgress: 0, error: null });

    try {
      const res = await apiService.uploadSingle(file, (percent) => {
        set({ uploadProgress: percent });
      });

      if (!res.success || !res.attachment) {
        throw new Error('Failed to upload media file');
      }

      set({ isUploadingAttachment: false, uploadProgress: 100 });

      // Stage attachment and send directly
      set({ pendingAttachments: [res.attachment] });
      const success = await get().sendChatMessage(textContent);
      return success;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send media message';
      set({ error: msg, isUploadingAttachment: false, uploadProgress: 0 });
      return false;
    }
  },

  clearLocalMessages: (conversationId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [],
      },
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastMessage: undefined } : c
      ),
    }));
  },
}));
