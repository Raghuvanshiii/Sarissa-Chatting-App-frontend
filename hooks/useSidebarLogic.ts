'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useAppStore } from '../store/useAppStore';
import { Conversation, User } from '../types';

export function useSidebarLogic() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [filterQuery, setFilterQuery] = useState('');

  const { user, isAuthenticated, openAuthModal, openProfileModal } = useAuthStore();
  const { favoriteConversations } = useAppStore();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    openNewChatModal,
    openCreateGroupModal,
    isLoadingConversations,
    typingUsers,
    getParticipantPresence,
  } = useChatStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  const totalCount = conversations.length;
  const unreadChatsCount = useMemo(() => {
    return conversations.filter((c) => (c.unreadCount ?? 0) > 0).length;
  }, [conversations]);

  const groupChatsCount = useMemo(() => {
    return conversations.filter((c) => c.type === 'group').length;
  }, [conversations]);

  const favoriteChatsCount = useMemo(() => {
    return conversations.filter((c) => Boolean(favoriteConversations[c._id])).length;
  }, [conversations, favoriteConversations]);

  // Helper to extract direct chat recipient
  const getDirectChatRecipient = (conv: Conversation): User | null => {
    if (!user || !conv.participants) return null;
    const recipient = conv.participants.find(
      (p) => (typeof p === 'object' ? p._id : p) !== user._id
    );
    return (typeof recipient === 'object' ? recipient : null) as User | null;
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeTab === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) return false;
      if (activeTab === 'groups' && c.type !== 'group') return false;
      if (activeTab === 'favorites' && !favoriteConversations[c._id]) return false;

      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        if (c.type === 'direct') {
          const recipient = getDirectChatRecipient(c);
          if (!recipient) return false;
          return (
            recipient.fullName.toLowerCase().includes(q) ||
            recipient.username.toLowerCase().includes(q)
          );
        } else {
          return c.name?.toLowerCase().includes(q);
        }
      }

      return true;
    });
  }, [conversations, activeTab, filterQuery, user]);

  return {
    user,
    isAuthenticated,
    openAuthModal,
    openProfileModal,
    conversations,
    filteredConversations,
    activeConversation,
    setActiveConversation,
    openNewChatModal,
    openCreateGroupModal,
    isLoadingConversations,
    typingUsers,
    getParticipantPresence,
    getDirectChatRecipient,
    activeTab,
    setActiveTab,
    filterQuery,
    setFilterQuery,
    totalCount,
    unreadChatsCount,
    groupChatsCount,
    favoriteChatsCount,
    favoriteConversations,
  };
}
