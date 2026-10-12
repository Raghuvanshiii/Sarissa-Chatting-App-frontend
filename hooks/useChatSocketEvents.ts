'use client';

import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { Message, MessageDeliveryStatus, Reaction, UserStatus } from '../types';

interface UseChatSocketEventsProps {
  onNewMessage: (message: Message) => void;
  onTypingStarted: (payload: { conversationId: string; userId: string; username?: string }) => void;
  onTypingStopped: (payload: { conversationId: string; userId: string }) => void;
  onUserOnline: (payload: { userId: string; status: UserStatus; lastSeen?: string }) => void;
  onUserOffline: (payload: { userId: string; lastSeen?: string }) => void;
  onPresenceUpdate: (payload: { userId: string; status: UserStatus; lastSeen?: string }) => void;
  onMessageStatusUpdated: (payload: { conversationId: string; messageIds: string[]; status: MessageDeliveryStatus }) => void;
  onMessageReadReceipt: (payload: { conversationId: string; readerId: string; messageIds?: string[] }) => void;
  onReactionUpdated: (payload: { conversationId: string; messageId: string; reactions: Reaction[] }) => void;
  onMessageDeleted: (payload: {
    conversationId: string;
    messageIds: string[];
    deleteType?: 'me' | 'everyone';
    deletedBy?: string;
    deletedForUserId?: string;
  }) => void;
  onConversationCleared?: (payload: { conversationId: string; clearedBy?: string }) => void;
  onDisappearingTimerUpdated?: (payload: { conversationId: string; timer: 'off' | '24h' | '7d' | '90d' }) => void;
  onIncomingCall?: (data: {
    callId: string;
    conversationId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callType: 'audio' | 'video';
    isGroup?: boolean;
    groupName?: string;
  }) => void;
}

export function useChatSocketEvents({
  onNewMessage,
  onTypingStarted,
  onTypingStopped,
  onUserOnline,
  onUserOffline,
  onPresenceUpdate,
  onMessageStatusUpdated,
  onMessageReadReceipt,
  onReactionUpdated,
  onMessageDeleted,
  onConversationCleared,
  onDisappearingTimerUpdated,
  onIncomingCall,
}: UseChatSocketEventsProps) {
  useEffect(() => {
    const unsubMsg = socketService.onNewMessage((incomingMessage) => {
      onNewMessage(incomingMessage);
    });

    const unsubTypingStart = socketService.onTypingStarted(({ conversationId, userId, username }) => {
      onTypingStarted({ conversationId, userId, username });
    });

    const unsubTypingStop = socketService.onTypingStopped(({ conversationId, userId }) => {
      onTypingStopped({ conversationId, userId });
    });

    const unsubOnline = socketService.onUserOnline(({ userId, status, lastSeen }) => {
      onUserOnline({ userId, status, lastSeen });
    });

    const unsubOffline = socketService.onUserOffline(({ userId, lastSeen }) => {
      onUserOffline({ userId, lastSeen });
    });

    const unsubUpdate = socketService.onPresenceUpdate(({ userId, status, lastSeen }) => {
      onPresenceUpdate({ userId, status, lastSeen });
    });

    const unsubStatus = socketService.onMessageStatusUpdated(({ conversationId, messageIds, status }) => {
      onMessageStatusUpdated({ conversationId, messageIds, status });
    });

    const unsubRead = socketService.onMessageReadReceipt(({ conversationId, readerId, messageIds }) => {
      onMessageReadReceipt({ conversationId, readerId, messageIds });
    });

    const unsubReaction = socketService.onReactionUpdated(({ conversationId, messageId, reactions }) => {
      onReactionUpdated({ conversationId, messageId, reactions });
    });

    const unsubDelete = socketService.onMessageDeleted(
      ({ conversationId, messageIds, deleteType, deletedBy, deletedForUserId }) => {
        onMessageDeleted({ conversationId, messageIds, deleteType, deletedBy, deletedForUserId });
      }
    );

    const unsubCleared = onConversationCleared
      ? socketService.onConversationCleared((data) => onConversationCleared(data))
      : () => {};

    const unsubTimer = onDisappearingTimerUpdated
      ? socketService.onDisappearingTimerUpdated((data) => onDisappearingTimerUpdated(data))
      : () => {};

    const unsubCall = onIncomingCall
      ? socketService.onIncomingCall((data) => onIncomingCall(data))
      : () => {};

    return () => {
      unsubMsg();
      unsubTypingStart();
      unsubTypingStop();
      unsubOnline();
      unsubOffline();
      unsubUpdate();
      unsubStatus();
      unsubRead();
      unsubReaction();
      unsubDelete();
      unsubCleared();
      unsubTimer();
      unsubCall();
    };
  }, [
    onNewMessage,
    onTypingStarted,
    onTypingStopped,
    onUserOnline,
    onUserOffline,
    onPresenceUpdate,
    onMessageStatusUpdated,
    onMessageReadReceipt,
    onReactionUpdated,
    onMessageDeleted,
    onConversationCleared,
    onDisappearingTimerUpdated,
    onIncomingCall,
  ]);
}
