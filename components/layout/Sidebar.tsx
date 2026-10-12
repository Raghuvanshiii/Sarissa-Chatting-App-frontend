'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  MessageSquarePlus,
  Search, 
  Menu, 
  User as UserIcon, 
  Check, 
  CheckCheck, 
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Star,
} from 'lucide-react';
import { useSidebarLogic } from '../../hooks/useSidebarLogic';
import { Conversation, User } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { MobileNavigation } from './MobileNavigation';

export const Sidebar: React.FC = () => {
  const {
    user,
    isAuthenticated,
    openProfileModal,
    conversations,
    filteredConversations,
    activeConversation,
    setActiveConversation,
    openNewChatModal,
    openCreateGroupModal,
    isLoadingConversations,
    getParticipantPresence,
    getDirectChatRecipient,
    activeTab,
    setActiveTab,
    filterQuery,
    setFilterQuery,
    unreadChatsCount,
    favoriteChatsCount,
    favoriteConversations,
  } = useSidebarLogic();

  const { mutedConversations } = useAppStore();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [viewMode, setViewMode] = useState<'chats' | 'friends'>('chats');
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState(true);

  // Group conversations for "friends" view
  const directChats = filteredConversations.filter((c) => c.type === 'direct');
  const groupChats = filteredConversations.filter((c) => c.type === 'group');

  return (
    <aside className="w-full h-full bg-[#FFF0F3] border-r border-[#F7CAD0] flex flex-col z-10 flex-shrink-0 select-none overflow-hidden">
      {/* 1. Header Bar ("Chats" Title + Mobile New Chat CTA) */}
      <header className="px-4.5 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <h1 className="font-cute text-2xl lg:text-[27px] font-bold text-[#2D151D] tracking-tight">
          Chats
        </h1>
        <button
          type="button"
          onClick={openNewChatModal}
          className="p-1.5 rounded-full bg-[#E05375] text-white hover:bg-[#D43D61] transition active:scale-95 shadow-2xs cursor-pointer md:hidden"
          title="New conversation"
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
        </button>
      </header>

      {/* 2. Permanent Rounded Pill Search Bar with Filters icon */}
      <div className="px-4 py-1.5 flex-shrink-0">
        <div className="relative flex items-center w-full bg-white rounded-full border border-[#F5CAD3] shadow-2xs transition focus-within:border-[#E05375]">
          <Search className="w-4 h-4 text-[#9A707E] ml-3.5 flex-shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-transparent pl-2.5 pr-8 py-2 text-xs font-cute text-[#2D151D] placeholder:text-[#9A707E] focus:outline-none"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-3 p-1 text-[#9A707E] hover:text-[#7D2338] transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter Tabs Bar (All 3, Unread 3, Groups, Favorites) */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-cute text-xs flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shadow-2xs whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#E05375] text-white'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span>All</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'unread'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span>Unread</span>
          {unreadChatsCount > 0 && (
            <span
              className={`min-w-4 h-4 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activeTab === 'unread' ? 'bg-white/25 text-white' : 'bg-[#E05375] text-white'
              }`}
            >
              {unreadChatsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'groups'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span>Groups</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'favorites'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span>Favorites</span>
          {favoriteChatsCount > 0 && (
            <span
              className={`min-w-4 h-4 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activeTab === 'favorites' ? 'bg-white/25 text-white' : 'bg-[#E05375] text-white'
              }`}
            >
              {favoriteChatsCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Chat List Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {isLoadingConversations && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-[#9A707E] font-cute text-xs">
            <span>Loading messages...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#7C5362] font-cute text-xs">
            {activeTab === 'unread' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mb-2.5 shadow-2xs">
                  <CheckCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <p className="font-bold text-sm text-[#2D151D]">No unread messages</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  You are all caught up!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  View all chats
                </button>
              </>
            ) : filterQuery.trim() ? (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No chats found</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  No conversations match &ldquo;{filterQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Clear search
                </button>
              </>
            ) : activeTab === 'groups' ? (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No group chats found</p>
                <button
                  type="button"
                  onClick={openCreateGroupModal}
                  className="mt-3 px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Create a group
                </button>
              </>
            ) : activeTab === 'favorites' ? (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No favorite chats yet</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  Mark chats as favorite to find them quickly
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  View all chats
                </button>
              </>
            ) : (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No conversations found</p>
                <button
                  type="button"
                  onClick={openNewChatModal}
                  className="mt-3 px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Start a new chat
                </button>
              </>
            )}
          </div>
        ) : (
          /* Standard Chats List */
          filteredConversations.map((conv) => {
            const isSelected = activeConversation?._id === conv._id;
            const isDirect = conv.type === 'direct';
            const recipient = isDirect ? getDirectChatRecipient(conv) : null;
            const title = isDirect && recipient ? recipient.fullName : conv.name || 'Group Chat';
            const avatarUrl = isDirect && recipient ? recipient.avatar : conv.avatar;
            const isMuted = Boolean(mutedConversations[conv._id]);
            const presence = isDirect && recipient ? getParticipantPresence(recipient._id, recipient.status || 'offline') : null;
            const isOnline = presence?.status === 'online';

            const isOwnLastMessage =
              conv.lastMessage &&
              (typeof conv.lastMessage.senderId === 'object' && conv.lastMessage.senderId !== null
                ? (conv.lastMessage.senderId as { _id?: string })._id === user?._id
                : conv.lastMessage.senderId === user?._id);

            // Formatting last message snippet
            const lastMsgContent = conv.lastMessage?.content || '';
            let previewText = lastMsgContent;
            if (conv.lastMessage?.deletedForEveryone) {
              previewText = isOwnLastMessage ? 'You deleted this message' : 'This message was deleted';
            } else if (lastMsgContent.startsWith('{"_type":"poll"')) {
              previewText = '📊 Poll';
            } else if (lastMsgContent.startsWith('{"_type":"contact"')) {
              previewText = '👤 Contact';
            } else if (lastMsgContent.startsWith('{"_type":"sticker"') || lastMsgContent.startsWith('{"_type":"gif"')) {
              previewText = lastMsgContent.includes('"name":"GIF"') || lastMsgContent.startsWith('{"_type":"gif"') ? '🎬 GIF' : '🎨 Sticker';
            }

            const lastTime = conv.lastMessageAt
              ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '12:30';

            const isFavorite = Boolean(favoriteConversations[conv._id]);

            return (
              <div
                key={conv._id}
                onClick={() => setActiveConversation(conv)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition duration-150 ${
                  isSelected 
                    ? 'bg-[#FCDAE1] border border-[#F7BAC7] shadow-2xs' 
                    : 'hover:bg-[#FCEAEF] border border-transparent'
                }`}
              >
                {/* Avatar with Online Pip */}
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={title}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-2xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#FCE7EC] text-[#C24A68] text-base font-bold flex items-center justify-center font-cute ring-2 ring-white shadow-2xs">
                      {title.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Presence green indicator badge (only when online) */}
                  {isDirect && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white bg-emerald-500" />
                  )}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight">
                      {title}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isFavorite && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      )}
                      <span className="text-[12px] font-cute text-[#9A707E] font-medium">
                        {lastTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate text-xs font-cute text-[#7C5362]">
                      {isOwnLastMessage && !conv.lastMessage?.deletedForEveryone && (
                        <span className="flex-shrink-0">
                          {conv.lastMessage?.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#E05375] stroke-[2.4]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#9A707E]" />
                          )}
                        </span>
                      )}
                      <span className={`truncate ${conv.lastMessage?.deletedForEveryone ? 'italic text-[#9A707E]' : ''}`}>
                        {previewText || (isDirect ? 'Tap to chat' : 'Group')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {conv.unreadCount && conv.unreadCount > 0 ? (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#E05375] text-white text-[11px] font-bold flex items-center justify-center font-sans shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile-Only Bottom Navigation Rail */}
      <MobileNavigation />
    </aside>
  );
};

