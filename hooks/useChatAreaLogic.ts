'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useWallpaperStore } from '../store/useWallpaperStore';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import { User, Message } from '../types';
import { CallType, CallParticipant } from '../components/chat/CallModal';
import { PollData, PollOption } from '../components/chat/PollModal';
import { StickerData } from '../components/chat/StickerModal';
import { useChatSocketEvents } from './useChatSocketEvents';
import { useVoiceRecorder } from './useVoiceRecorder';

// Helper to detect JSON payloads (poll, contact, sticker)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSpecialMessage(content?: string): any {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed._type === 'poll' || parsed._type === 'contact' || parsed._type === 'sticker' || parsed._type === 'gif')
      ) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function formatLastSeen(dateString?: string): string {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function useChatAreaLogic() {
  const {
    isDetailsPanelOpen,
    toggleDetailsPanel,
    isSearchInChatOpen,
    toggleSearchInChat,
    setSearchInChatOpen,
    triggerCall,
    clearTriggerCall,
    mutedConversations,
    setConversationMuted,
  } = useAppStore();

  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const {
    activeConversation,
    setActiveConversation,
    messages,
    isLoadingMessages,
    sendChatMessage,
    receiveMessage,
    openNewChatModal,
    openGroupInfoDrawer,
    typingUsers,
    setUserTyping,
    setUserPresence,
    getParticipantPresence,
    sendTypingIndicator,
    updateMessageStatus,
    handleReadReceipt,
    replyingTo,
    setReplyingTo,
    toggleReaction,
    updateMessageReactions,
    pendingAttachments,
    isUploadingAttachment,
    uploadProgress,
    removePendingAttachment,
    uploadFiles,
    sendDirectMedia,
    deleteMessages,
    handleMessagesDeleted,
    clearLocalMessages,
    updateMessageContent,
    setDisappearingTimer,
    handleDisappearingTimerUpdated,
  } = useChatStore();

  const { openWallpaperModal: rawOpenWallpaperModal, wallpaperDim, getEffectiveWallpaper } = useWallpaperStore();
  const openWallpaperModal = useCallback(
    () => rawOpenWallpaperModal(activeConversation?._id),
    [rawOpenWallpaperModal, activeConversation?._id]
  );
  const activeWallpaper = getEffectiveWallpaper(activeConversation?._id);

  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title: string; type: 'image' | 'video' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messagesToDelete, setMessagesToDelete] = useState<string[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [reactionsModalMessageId, setReactionsModalMessageId] = useState<string | null>(null);
  const [reactionsModalInitialEmoji, setReactionsModalInitialEmoji] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  // Attachment Menu & Modals State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);

  const attachmentButtonRef = useRef<HTMLButtonElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // WhatsApp Calling State (Audio & Video)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeCallType, setActiveCallType] = useState<CallType>('audio');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callPartner, setCallPartner] = useState<CallParticipant | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallConversationId, setActiveCallConversationId] = useState<string | null>(null);

  // Three Dots Menu & Features State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const threeDotsButtonRef = useRef<HTMLButtonElement>(null);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [disappearingTimers, setDisappearingTimers] = useState<Record<string, '24h' | '7d' | '90d' | 'off'>>({});

  // Message selection state
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Direct chat recipient
  const recipient: User | null = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'direct' || !user) return null;
    const currentUserId = String(user._id || (user as any)?.id || '');
    const found = activeConversation.participants.find(
      (p) => String(typeof p === 'object' ? (p._id || (p as any)?.id) : p) !== currentUserId
    );
    if (typeof found === 'object' && found !== null) {
      return found as User;
    }
    if (typeof found === 'string') {
      const allConversations = useChatStore.getState().conversations || [];
      for (const conv of allConversations) {
        const u = conv.participants?.find((p: any) => typeof p === 'object' && p !== null && String(p._id) === String(found));
        if (u) return u as User;
      }
    }
    return null;
  }, [activeConversation, user]);

  // Recipient live presence
  const recipientPresence = useMemo(() => {
    if (!recipient) return { status: 'offline' as const, lastSeen: undefined };
    return getParticipantPresence(recipient._id, recipient.status);
  }, [recipient, getParticipantPresence]);

  // Active messages (enforcing disappearing messages cutoff)
  const activeMessages: Message[] = useMemo(() => {
    if (!activeConversation) return [];
    const rawList = messages[activeConversation._id] || [];
    const timer = activeConversation.disappearingTimer || disappearingTimers[activeConversation._id];
    if (!timer || timer === 'off') {
      return rawList;
    }

    let durationMs = 0;
    if (timer === '24h') durationMs = 24 * 60 * 60 * 1000;
    else if (timer === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
    else if (timer === '90d') durationMs = 90 * 24 * 60 * 60 * 1000;

    if (durationMs <= 0) return rawList;

    const cutoff = Date.now() - durationMs;
    return rawList.filter((m) => {
      if (m.messageType === 'system') return true;
      if (m.isOptimistic) return true;
      const createdTime = new Date(m.createdAt).getTime();
      return createdTime >= cutoff;
    });
  }, [activeConversation, messages, disappearingTimers]);

  // Active typing users
  const currentTypingUsers = useMemo(() => {
    if (!activeConversation) return [];
    const list = typingUsers[activeConversation._id] || [];
    return list.filter((u) => u.userId !== user?._id);
  }, [activeConversation, typingUsers, user?._id]);

  // Matched message indices for in-chat search
  const matchedMessageIndices = useMemo(() => {
    if (!inChatSearchQuery.trim() || activeMessages.length === 0) return [];
    const query = inChatSearchQuery.toLowerCase();
    const indices: number[] = [];
    activeMessages.forEach((m, idx) => {
      if (m.content && m.content.toLowerCase().includes(query)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [activeMessages, inChatSearchQuery]);

  // Reset selection & popovers when active conversation changes
  useEffect(() => {
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    setReactionPickerMessageId(null);
    setReactionsModalMessageId(null);
    setIsMenuOpen(false);
    setSearchInChatOpen(false);
    setInChatSearchQuery('');
    setIsAttachmentMenuOpen(false);
    setIsContactModalOpen(false);
    setIsPollModalOpen(false);
    setIsStickerModalOpen(false);
  }, [activeConversation?._id, setSearchInChatOpen]);

  // Auto-scroll to bottom on new message or conversation switch
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeConversation?._id, currentTypingUsers.length]);

  // Voice recording hook
  const {
    isRecordingAudio,
    audioRecordingSeconds,
    formattedTimer: formattedAudioTimer,
    startAudioRecording,
    stopAudioRecording,
    cancelAudioRecording,
  } = useVoiceRecorder({
    isAuthenticated,
    hasActiveConversation: Boolean(activeConversation),
    onSendVoiceMessage: async (file: File) => {
      return await sendDirectMedia(file);
    },
  });

  // Decoupled Socket Events Hook
  useChatSocketEvents({
    onNewMessage: receiveMessage,
    onTypingStarted: ({ conversationId, userId, username }) => {
      setUserTyping(conversationId, { userId, username }, true);
    },
    onTypingStopped: ({ conversationId, userId }) => {
      setUserTyping(conversationId, { userId }, false);
    },
    onUserOnline: ({ userId, status, lastSeen }) => {
      setUserPresence(userId, status, lastSeen);
    },
    onUserOffline: ({ userId, lastSeen }) => {
      setUserPresence(userId, 'offline', lastSeen);
    },
    onPresenceUpdate: ({ userId, status, lastSeen }) => {
      setUserPresence(userId, status, lastSeen);
    },
    onMessageStatusUpdated: ({ conversationId, messageIds, status }) => {
      updateMessageStatus(conversationId, messageIds, status);
    },
    onMessageReadReceipt: ({ conversationId, readerId, messageIds }) => {
      handleReadReceipt(conversationId, readerId, messageIds);
    },
    onReactionUpdated: ({ conversationId, messageId, reactions }) => {
      updateMessageReactions(conversationId, messageId, reactions);
    },
    onMessageDeleted: ({ conversationId, messageIds, deleteType, deletedForUserId }) => {
      // If deleteType is 'me', strictly verify target recipient matches active user
      if (deleteType === 'me') {
        const currentId = user?._id ? String(user._id) : '';
        const targetId = deletedForUserId ? String(deletedForUserId) : '';
        if (!currentId || !targetId || currentId !== targetId) {
          return;
        }
      }
      handleMessagesDeleted(conversationId, messageIds, deleteType, deletedForUserId);
    },
    onConversationCleared: ({ conversationId, clearedBy }) => {
      const myId = user?._id ? String(user._id) : '';
      if (!clearedBy || String(clearedBy) === myId) {
        clearLocalMessages(conversationId);
      }
    },
    onDisappearingTimerUpdated: ({ conversationId, timer }) => {
      setDisappearingTimers((prev) => ({ ...prev, [conversationId]: timer }));
      handleDisappearingTimerUpdated(conversationId, timer);
    },
    onIncomingCall: (data) => {
      setActiveCallConversationId(data.conversationId);

      let callerName = data.callerName;
      let callerAvatar = data.callerAvatar;

      // Fallback lookup from conversations cache if caller details are missing, generic, or 'You'
      if (!callerName || callerName === 'You' || !callerAvatar) {
        const allConversations = useChatStore.getState().conversations || [];
        for (const c of allConversations) {
          const participant = c.participants?.find((p: any) => (p._id || p.id) === data.callerId);
          if (participant) {
            if (!callerName || callerName === 'You') {
              callerName = participant.fullName || participant.username || callerName;
            }
            if (!callerAvatar) {
              callerAvatar = participant.avatar;
            }
            break;
          }
        }
      }

      if (data.isGroup) {
        setCallPartner({
          id: data.callerId,
          name: data.groupName || 'Group Call',
          avatar: callerAvatar,
          username: `Incoming call from ${callerName || 'Someone'}`,
          isGroup: true,
        });
      } else {
        setCallPartner({
          id: data.callerId,
          name: callerName || 'User',
          avatar: callerAvatar,
          isGroup: false,
        });
      }
      setActiveCallType(data.callType);
      setActiveCallId(data.callId);
      setIsIncomingCall(true);
      setIsCallModalOpen(true);
    },
  });

  // Sync disappearing timer when active conversation changes
  useEffect(() => {
    if (activeConversation?._id && activeConversation.disappearingTimer) {
      setDisappearingTimers((prev) => ({
        ...prev,
        [activeConversation._id]: activeConversation.disappearingTimer || 'off',
      }));
    }
  }, [activeConversation?._id, activeConversation?.disappearingTimer]);

  // Start Call Handler
  const handleStartCall = useCallback((type: CallType) => {
    if (!activeConversation) return;

    if (activeConversation.type === 'direct') {
      const currentUserId = String(user?._id || (user as any)?.id || '');
      const otherParticipant = activeConversation.participants?.find((p: any) => {
        const pId = String(typeof p === 'object' ? (p._id || p.id) : p);
        return pId && pId !== currentUserId;
      });

      const userObj = recipient || (typeof otherParticipant === 'object' ? otherParticipant : null);
      let targetName = userObj?.fullName || (userObj as any)?.username;
      let targetAvatar = userObj?.avatar;
      let targetId = String(userObj?._id || (userObj as any)?.id || otherParticipant || '');

      // Check conversations participants if details are not populated
      if (!targetName || !targetAvatar) {
        const allConversations = useChatStore.getState().conversations || [];
        for (const conv of allConversations) {
          const u = conv.participants?.find((p: any) => typeof p === 'object' && p !== null && String(p._id) === targetId);
          if (u) {
            if (!targetName) targetName = (u as any).fullName || (u as any).username;
            if (!targetAvatar) targetAvatar = (u as any).avatar;
            break;
          }
        }
      }

      setCallPartner({
        id: targetId,
        name: targetName || activeConversation.name || 'User',
        avatar: targetAvatar || activeConversation.avatar,
        username: (userObj as any)?.username,
        isGroup: false,
      });
    } else {
      setCallPartner({
        id: activeConversation._id,
        name: activeConversation.name || 'Group',
        avatar: activeConversation.avatar,
        username: `${activeConversation.participants?.length || 0} members`,
        isGroup: true,
      });
    }

    setActiveCallConversationId(activeConversation._id);
    setActiveCallType(type);
    setIsIncomingCall(false);
    setActiveCallId(null);
    setIsCallModalOpen(true);
  }, [activeConversation, recipient, user]);

  // Trigger call listener from details panel
  useEffect(() => {
    if (triggerCall && activeConversation) {
      handleStartCall(triggerCall.type);
      clearTriggerCall();
    }
  }, [triggerCall, activeConversation, handleStartCall, clearTriggerCall]);

  const lastEndedCallKeyRef = useRef<string | null>(null);

  const handleCallEnded = useCallback(async (duration: number, type: CallType, incoming?: boolean) => {
    setIsCallModalOpen(false);
    setIsIncomingCall(false);
    setActiveCallId(null);

    const targetConvId = activeCallConversationId || activeConversation?._id;
    if (!targetConvId) return;

    const isIncoming = incoming !== undefined ? incoming : isIncomingCall;

    // Deduplication guard: ignore duplicate calls within 4 seconds for the same conversation
    const dedupeKey = `${targetConvId}_${type}_${Math.floor(Date.now() / 4000)}`;
    if (lastEndedCallKeyRef.current === dedupeKey) {
      return;
    }
    lastEndedCallKeyRef.current = dedupeKey;

    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationStr =
      duration > 0 ? `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s` : 'Missed';
    const isGroup = activeConversation?.type === 'group' || callPartner?.isGroup;
    const icon = type === 'video' ? '🎥' : '📞';
    const callTitle = isGroup
      ? type === 'video' ? 'Group video call' : 'Group voice call'
      : type === 'video' ? 'Video call' : 'Voice call';
    const summary = `${icon} ${callTitle} • ${durationStr}`;

    // ONLY the CALLER logs the single call event into the shared conversation.
    // The server broadcasts this single message to all participants in the conversation,
    // so both caller and receiver see the single unified message in the chat.
    if (!isIncoming) {
      await sendChatMessage(summary);
    }

    // Record call in persistent call history for local user
    if (callPartner) {
      useAppStore.getState().addCallHistoryEntry({
        conversationId: targetConvId,
        participantId: callPartner.id,
        participantName: callPartner.name,
        participantAvatar: callPartner.avatar,
        callType: type,
        direction: duration > 0 ? (isIncoming ? 'incoming' : 'outgoing') : (isIncoming ? 'missed' : 'outgoing'),
        timestamp: new Date(),
        durationText: durationStr,
        isGroup: !!isGroup,
        isMissed: duration === 0,
        isOwn: !isIncoming,
      });
    }
  }, [activeCallConversationId, activeConversation, callPartner, isIncomingCall, sendChatMessage]);

  const handleSetDisappearingTimer = useCallback(async (timer: 'off' | '24h' | '7d' | '90d') => {
    if (!activeConversation) return;

    setDisappearingTimers((prev) => ({
      ...prev,
      [activeConversation._id]: timer,
    }));

    await setDisappearingTimer(activeConversation._id, timer);
  }, [activeConversation, setDisappearingTimer]);

  const handleClearChat = useCallback(async () => {
    if (!activeConversation) return;
    try {
      await socketService.clearConversation(activeConversation._id);
      clearLocalMessages(activeConversation._id);
    } catch {
      clearLocalMessages(activeConversation._id);
    }
  }, [activeConversation, clearLocalMessages]);

  // Typing debounce handler
  const handleComposerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setComposerText(val);

    if (!activeConversation || !isAuthenticated) return;

    sendTypingIndicator(activeConversation._id, true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingIndicator(activeConversation._id, false);
    }, 2000);
  }, [activeConversation, isAuthenticated, sendTypingIndicator]);

  // Send message handler
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !isAuthenticated || isSending) return;

    const trimmed = composerText.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    setIsSending(true);
    try {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      sendTypingIndicator(activeConversation._id, false);

      const targetReplyId = replyingTo?._id;
      const success = await sendChatMessage(trimmed || undefined, targetReplyId);
      if (success) {
        setComposerText('');
        setReplyingTo(null);
        setShowEmojiPicker(false);
      }
    } finally {
      setIsSending(false);
    }
  }, [
    activeConversation,
    isAuthenticated,
    isSending,
    composerText,
    pendingAttachments.length,
    sendTypingIndicator,
    replyingTo,
    sendChatMessage,
    setReplyingTo,
  ]);

  // Message selection handler: allows selecting single or multiple messages
  const toggleSelectMessage = useCallback((_e: React.MouseEvent, messageId: string) => {
    setSelectedMessageIds((prev) => {
      const exists = prev.includes(messageId);
      const next = exists
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId];

      if (next.length === 0) {
        setIsSelectMode(false);
      } else {
        setIsSelectMode(true);
      }
      return next;
    });
  }, []);

  // Keyboard 'Escape' (Esc) handler to clear selection and restore normal header
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
          return;
        }
        if (isSelectMode || selectedMessageIds.length > 0) {
          setSelectedMessageIds([]);
          setIsSelectMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, selectedMessageIds.length, isDeleteModalOpen]);

  // Poll voting handler
  const handlePollVote = useCallback(async (messageId: string, optionId: string) => {
    if (!activeConversation || !user) return;
    try {
      const currentList = messages[activeConversation._id] || [];
      const currentMsg = currentList.find((m) => m._id === messageId);
      if (currentMsg) {
        const special = parseSpecialMessage(currentMsg.content);
        if (special && special._type === 'poll') {
          const uid = user._id;
          const pollData = { ...special } as PollData;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isUserVote = (v: any) => {
            const id = typeof v === 'object' && v !== null ? v.userId : v;
            return id === uid;
          };

          const userAlreadyVotedThisOption = pollData.options
            .find((o: PollOption) => o.id === optionId)
            ?.votes.some(isUserVote);

          const updatedOptions = pollData.options.map((opt: PollOption) => {
            let nextVotes = [...opt.votes];
            if (!pollData.allowMultiple) {
              nextVotes = nextVotes.filter((v) => !isUserVote(v));
            }
            if (opt.id === optionId) {
              if (userAlreadyVotedThisOption) {
                nextVotes = nextVotes.filter((v) => !isUserVote(v));
              } else {
                nextVotes.push({
                  userId: uid,
                  username: user.username,
                  name: user.fullName,
                  avatar: user.avatar,
                  votedAt: new Date().toISOString(),
                });
              }
            }
            return { ...opt, votes: nextVotes };
          });

          pollData.options = updatedOptions;
          updateMessageContent(activeConversation._id, messageId, JSON.stringify(pollData));
        }
      }
      await socketService.votePoll({
        messageId,
        optionId,
        conversationId: activeConversation._id,
      });
    } catch (err) {
      console.error('Failed to vote on poll:', err);
    }
  }, [activeConversation, user, messages, updateMessageContent]);

  // File drag & drop
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (activeConversation && !isDraggingOver) {
      setIsDraggingOver(true);
    }
  }, [activeConversation, isDraggingOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!activeConversation) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }, [activeConversation, uploadFiles]);

  const reactionsModalMessage = useMemo(() => {
    if (!reactionsModalMessageId) return null;
    return activeMessages.find((m) => m._id === reactionsModalMessageId) || null;
  }, [activeMessages, reactionsModalMessageId]);

  return {
    // Current user & active context
    user,
    isAuthenticated,
    openAuthModal,
    activeConversation,
    setActiveConversation,
    recipient,
    recipientPresence,
    activeMessages,
    isLoadingMessages,
    currentTypingUsers,

    // Composer & sending
    composerText,
    setComposerText,
    handleComposerChange,
    handleSendMessage,
    sendChatMessage,
    isSending,
    replyingTo,
    setReplyingTo,
    showEmojiPicker,
    setShowEmojiPicker,
    composerInputRef,
    messagesEndRef,

    // Voice recorder
    isRecordingAudio,
    audioRecordingSeconds,
    formattedAudioTimer,
    startAudioRecording,
    stopAudioRecording,
    cancelAudioRecording,

    // Attachments & uploads
    pendingAttachments,
    isUploadingAttachment,
    uploadProgress,
    removePendingAttachment,
    uploadFiles,
    sendDirectMedia,
    isAttachmentMenuOpen,
    setIsAttachmentMenuOpen,
    attachmentButtonRef,
    documentInputRef,
    mediaInputRef,
    audioInputRef,
    fileInputRef,
    handleFileSelect,
    isDraggingOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Calling
    isCallModalOpen,
    setIsCallModalOpen,
    activeCallType,
    isIncomingCall,
    callPartner,
    activeCallId,
    activeCallConversationId,
    handleStartCall,
    handleCallEnded,

    // In-chat search
    isSearchInChatOpen,
    toggleSearchInChat,
    setSearchInChatOpen,
    inChatSearchQuery,
    setInChatSearchQuery,
    currentSearchIndex,
    setCurrentSearchIndex,
    matchedMessageIndices,

    // Message selection & deletion
    selectedMessageIds,
    setSelectedMessageIds,
    isSelectMode,
    setIsSelectMode,
    toggleSelectMessage,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    messagesToDelete,
    setMessagesToDelete,
    deleteMessages,

    // Reactions & Pickers
    reactionPickerMessageId,
    setReactionPickerMessageId,
    reactionsModalMessageId,
    setReactionsModalMessageId,
    reactionsModalMessage,
    reactionsModalInitialEmoji,
    setReactionsModalInitialEmoji,
    toggleReaction,

    // Modals
    isMenuOpen,
    setIsMenuOpen,
    threeDotsButtonRef,
    isCameraModalOpen,
    setIsCameraModalOpen,
    isContactModalOpen,
    setIsContactModalOpen,
    isPollModalOpen,
    setIsPollModalOpen,
    isStickerModalOpen,
    setIsStickerModalOpen,
    isDisappearingModalOpen,
    setIsDisappearingModalOpen,
    disappearingTimers,
    handleSetDisappearingTimer,
    handleClearChat,
    handlePollVote,

    // Details panel & UI
    isDetailsPanelOpen,
    toggleDetailsPanel,
    openGroupInfoDrawer,
    openNewChatModal,
    mutedConversations,
    setConversationMuted,
    lightboxMedia,
    setLightboxMedia,
    openWallpaperModal,
    activeWallpaper,
    wallpaperDim,
  };
}
