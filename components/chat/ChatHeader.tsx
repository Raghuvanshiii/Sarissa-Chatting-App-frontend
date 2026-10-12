'use client';

import React from 'react';
import { 
  ChevronLeft, 
  Phone, 
  Video,
  Search, 
  MoreVertical,
  Trash2, 
  X 
} from 'lucide-react';
import { User, Conversation } from '../../types';
import { formatLastSeen } from '../../utils/dateUtils';

interface ChatHeaderProps {
  conversation: Conversation | null;
  recipient: User | null;
  recipientPresence: { status: string; lastSeen?: string };
  typingUsers: { userId: string; username?: string }[];
  isSelectMode: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onBack?: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onToggleSearch: () => void;
  onToggleMenu: () => void;
  onOpenDetails?: () => void;
  isMuted?: boolean;
  threeDotsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  children?: React.ReactNode;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  recipient,
  recipientPresence,
  typingUsers,
  isSelectMode,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onBack,
  onStartCall,
  onToggleSearch,
  onToggleMenu,
  onOpenDetails,
  isMuted = false,
  threeDotsButtonRef,
  children,
}) => {
  if (!conversation) return null;

  const isDirect = conversation.type === 'direct';
  const title = isDirect && recipient ? recipient.fullName : conversation.name || 'Group Chat';
  const avatarUrl = isDirect && recipient ? recipient.avatar : conversation.avatar;
  const isOnline = recipientPresence.status === 'online';

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].username || 'Someone'} is typing...`
      : `${typingUsers.length} people typing...`
    : null;

  // Selection mode header: temporarily removes name, audio call, video call, search, and three dots
  if (isSelectMode && selectedCount > 0) {
    return (
      <header className="h-[68px] sm:h-[72px] bg-[#FCEBED] border-b border-[#F7CAD0] px-3 sm:px-5 flex items-center justify-between z-20 select-none shadow-xs text-[#2D151D] animate-in fade-in duration-150">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-[#741E34] hover:text-[#521323] transition-all cursor-pointer font-medium text-xs sm:text-sm border border-[#F7CAD0] shadow-2xs active:scale-95"
            title="Deselect all (Esc)"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            <span className="font-semibold">Esc</span>
          </button>
          <span className="text-sm sm:text-base font-bold text-[#2D151D] ml-1">
            {selectedCount} selected
          </span>
        </div>

        <button
          type="button"
          onClick={onDeleteSelected}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs shadow-[#E05375]/30"
          title="Delete selected messages"
        >
          <Trash2 className="w-4 h-4 stroke-[2.2]" />
          <span>Delete</span>
        </button>
      </header>
    );
  }

  return (
    <header className="h-[68px] sm:h-[72px] bg-[#FCEBED] border-b border-[#F7CAD0] px-3 sm:px-5 flex items-center justify-between z-20 select-none shadow-xs">
      {/* Left: Back Arrow + Avatar + Contact Info */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Back Button (Mobile & Desktop) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full text-[#741E34] hover:bg-black/5 active:scale-95 transition cursor-pointer flex-shrink-0"
            title="Back to chats"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
          </button>
        )}

        {/* Circular Avatar */}
        <div 
          onClick={onOpenDetails}
          className="relative flex-shrink-0 cursor-pointer group"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={title}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white shadow-2xs group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#FAD0D8] text-[#741E34] text-sm sm:text-base font-bold flex items-center justify-center ring-2 ring-white shadow-2xs">
              {title.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Tiny online pip indicator */}
          {isDirect && isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </div>

        {/* Title and Status */}
        <div 
          onClick={onOpenDetails}
          className="min-w-0 cursor-pointer flex-1"
        >
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-[#2D151D] truncate leading-tight">
              {title}
            </h2>
          </div>

          <p className="text-[11px] sm:text-xs lg:text-[13px] font-medium truncate flex items-center gap-1">
            {typingText ? (
              <span className="text-[#E05375] font-semibold italic animate-pulse">{typingText}</span>
            ) : isDirect ? (
              isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-emerald-700 font-medium">online</span>
                </>
              ) : recipientPresence.lastSeen ? (
                <span className="text-[#7C5362]">{formatLastSeen(recipientPresence.lastSeen)}</span>
              ) : (
                <span className="text-[#7C5362]">offline</span>
              )
            ) : (
              <span className="text-[#7C5362]">{`${conversation.participants?.length || 0} members`}</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Circular Pink Action Buttons: Search, Call, Video, More */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 1. Search (Hidden on tiny mobile <640px, accessible via 3-dots menu) */}
        <button
          type="button"
          onClick={onToggleSearch}
          className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCD8E0] text-[#741E34] hover:bg-[#F8BAC7] items-center justify-center transition cursor-pointer shadow-2xs"
          title="Search conversation"
        >
          <Search className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* 2. Voice Call */}
        <button
          type="button"
          onClick={() => onStartCall('audio')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCD8E0] text-[#741E34] hover:bg-[#F8BAC7] flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
          title="Voice call"
        >
          <Phone className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* 3. Video Call */}
        <button
          type="button"
          onClick={() => onStartCall('video')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCD8E0] text-[#741E34] hover:bg-[#F8BAC7] flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
          title="Video call"
        >
          <Video className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* 4. More Options */}
        <div className="relative flex-shrink-0">
          <button
            ref={threeDotsButtonRef}
            type="button"
            onClick={onToggleMenu}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCD8E0] text-[#741E34] hover:bg-[#F8BAC7] flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
            title="More options"
          >
            <MoreVertical className="w-4 h-4 stroke-[2.2]" />
          </button>
          {children}
        </div>
      </div>
    </header>
  );
};
