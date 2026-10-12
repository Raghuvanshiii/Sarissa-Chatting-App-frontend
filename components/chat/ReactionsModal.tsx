'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Smile, Plus } from 'lucide-react';
import { Message, Conversation, User, Reaction } from '../../types';
import { WhatsAppEmoji } from './WhatsAppEmoji';

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  activeConversation: Conversation | null;
  currentUser: User | null;
  initialEmoji?: string | null;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onAddReaction?: (messageId: string) => void;
}

interface ReactorDisplay {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  emoji: string;
  isCurrentUser: boolean;
  createdAt?: string;
}

export const ReactionsModal: React.FC<ReactionsModalProps> = ({
  isOpen,
  onClose,
  message,
  activeConversation,
  currentUser,
  initialEmoji,
  onRemoveReaction,
  onAddReaction,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('all');

  // Set initial tab when opened with a specific emoji
  useEffect(() => {
    if (isOpen) {
      if (initialEmoji) {
        setSelectedTab(initialEmoji);
      } else {
        setSelectedTab('all');
      }
    }
  }, [isOpen, initialEmoji]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resolve reactor details for each reaction
  const reactors: ReactorDisplay[] = useMemo(() => {
    if (!message || !message.reactions || message.reactions.length === 0) {
      return [];
    }

    const currentUserId = currentUser?._id ? String(currentUser._id) : '';

    return message.reactions.map((r: Reaction, index: number) => {
      const rawUser = r.userId;
      const isUserObj = typeof rawUser === 'object' && rawUser !== null;
      const rawUid = isUserObj
        ? String((rawUser as { _id?: string })._id || '')
        : String(rawUser || '');
      const isCurrentUser = Boolean(currentUserId && rawUid === currentUserId);

      let name = '';
      let username = '';
      let avatar: string | undefined = undefined;

      if (isCurrentUser) {
        name = 'You';
        username = currentUser?.username || '';
        avatar = currentUser?.avatar || (isUserObj ? (rawUser as { avatar?: string }).avatar : undefined);
      } else if (isUserObj) {
        const u = rawUser as { fullName?: string; username?: string; avatar?: string };
        name = u.fullName || u.username || '';
        username = u.username || '';
        avatar = u.avatar;
      }

      // If name not resolved, look up in activeConversation participants
      if ((!name || name === 'User') && activeConversation?.participants) {
        const participant = activeConversation.participants.find(
          (p) => String(p._id) === rawUid
        );
        if (participant) {
          name = participant.fullName || participant.username || 'User';
          username = participant.username || '';
          avatar = avatar || participant.avatar;
        }
      }

      // If still not resolved, check message sender
      if (!name && message.senderId) {
        const senderObj =
          typeof message.senderId === 'object' && message.senderId !== null
            ? message.senderId
            : null;
        if (senderObj && String(senderObj._id) === rawUid) {
          name = senderObj.fullName || senderObj.username || 'User';
          username = senderObj.username || '';
          avatar = avatar || senderObj.avatar;
        }
      }

      if (!name) {
        name = isCurrentUser ? 'You' : 'User';
      }

      return {
        id: `${rawUid || index}-${r.emoji}`,
        name,
        username,
        avatar,
        emoji: r.emoji,
        isCurrentUser,
        createdAt: r.createdAt,
      };
    });
  }, [message, activeConversation, currentUser]);

  // Aggregate emoji counts for tabs
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reactors.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }, [reactors]);

  // If active tab emoji no longer exists in reactions, fall back to 'all'
  useEffect(() => {
    if (selectedTab !== 'all' && !tabCounts[selectedTab]) {
      setSelectedTab('all');
    }
  }, [tabCounts, selectedTab]);

  // Filter reactors by selected tab
  const filteredReactors = useMemo(() => {
    if (selectedTab === 'all') {
      // Put current user first
      return [...reactors].sort((a, b) => (b.isCurrentUser ? 1 : 0) - (a.isCurrentUser ? 1 : 0));
    }
    return reactors
      .filter((r) => r.emoji === selectedTab)
      .sort((a, b) => (b.isCurrentUser ? 1 : 0) - (a.isCurrentUser ? 1 : 0));
  }, [reactors, selectedTab]);

  if (!isOpen || !message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-[#FFF5F7] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] border border-[#F5BAC6] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F5BAC6] bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-[#C24A68]" />
            <h3 className="text-sm font-bold text-[#2D151D]">
              Reactions
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FCE7EC] text-[#9F2241] border border-[#F5BAC6]">
              {reactors.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {onAddReaction && message && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddReaction(message._id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-[#C24A68] hover:bg-[#B83253] shadow-xs transition cursor-pointer"
                title="React with any emoji"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>React</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reaction Emoji Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#F5BAC6] overflow-x-auto no-scrollbar bg-[#FFF0F3]">
          <button
            type="button"
            onClick={() => setSelectedTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition whitespace-nowrap cursor-pointer ${
              selectedTab === 'all'
                ? 'bg-[#C24A68] text-white shadow-2xs font-bold'
                : 'text-[#7C5362] hover:bg-[#FCE7EC] font-semibold'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FCE7EC] text-[#9F2241]'
              }`}
            >
              {reactors.length}
            </span>
          </button>

          {Object.entries(tabCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setSelectedTab(emoji)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition whitespace-nowrap cursor-pointer ${
                selectedTab === emoji
                  ? 'bg-[#C24A68] text-white shadow-2xs font-bold'
                  : 'text-[#7C5362] hover:bg-[#FCE7EC] font-semibold'
              }`}
            >
              <WhatsAppEmoji emoji={emoji} size={16} />
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedTab === emoji
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FCE7EC] text-[#9F2241]'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Reactor List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F5BAC6]/60 p-1">
          {filteredReactors.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#7C5362]">
              No reactions found
            </div>
          ) : (
            filteredReactors.map((reactor) => (
              <div
                key={reactor.id}
                onClick={() => {
                  if (reactor.isCurrentUser && message) {
                    onRemoveReaction(message._id, reactor.emoji);
                  }
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition ${
                  reactor.isCurrentUser
                    ? 'hover:bg-[#FCE7EC]/60 cursor-pointer group'
                    : 'hover:bg-[#FFF0F3]'
                }`}
                title={reactor.isCurrentUser ? 'Click to remove your reaction' : undefined}
              >
                {/* User Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center font-bold text-sm shadow-2xs">
                    {reactor.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reactor.avatar}
                        alt={reactor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{reactor.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#2D151D] truncate">
                        {reactor.name}
                      </p>
                      {reactor.isCurrentUser && (
                        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-[#FCE7EC] text-[#9F2241] border border-[#F5BAC6]">
                          You
                        </span>
                      )}
                    </div>
                    {reactor.isCurrentUser ? (
                      <p className="text-xs text-[#C24A68] group-hover:text-rose-600 transition-colors flex items-center gap-1 font-semibold">
                        <span>Click to remove</span>
                        <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                    ) : (
                      reactor.username && (
                        <p className="text-xs text-[#7C5362] truncate">
                          @{reactor.username}
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Reacted Emoji */}
                <div className="flex items-center gap-2 flex-shrink-0 pl-3">
                  <WhatsAppEmoji
                    emoji={reactor.emoji}
                    size={24}
                    className="transition-transform hover:scale-125"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2.5 bg-[#FFEBF0]/70 border-t border-[#F5BAC6] text-[12px] text-[#7C5362] text-center font-medium">
          Tap on your reaction to remove it
        </div>
      </div>
    </div>
  );
};
