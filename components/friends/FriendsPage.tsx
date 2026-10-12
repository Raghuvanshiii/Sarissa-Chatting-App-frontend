'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  Star, 
  Users, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useAppStore } from '../../store/useAppStore';
import { apiService } from '../../services/api';
import { User } from '../../types';
import { getMediaUrl } from '../../utils/media';
import { MobileNavigation } from '../layout/MobileNavigation';

export const FriendsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    conversations, 
    activeConversation, 
    startDirectChat,
    getParticipantPresence 
  } = useChatStore();
  const { 
    favoriteContacts, 
    toggleFavoriteContact, 
    favoriteConversations 
  } = useAppStore();

  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'online'>('all');
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState<boolean>(true);
  const [loadingChatUserId, setLoadingChatUserId] = useState<string | null>(null);

  // Fetch all registered contacts on mount
  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const res = await apiService.searchUsers('');
        if (isMounted) {
          const list = (res.users || []).filter((u) => u._id !== user?._id);
          setFriends(list);
        }
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // Check if a friend is marked as favorite (either via contact favorite or conversation favorite)
  const isFriendFavorite = (friendId: string) => {
    if (favoriteContacts[friendId]) return true;

    // Check if there is a direct conversation that is favorited
    const directConv = conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.participants?.some(
          (p) => (typeof p === 'object' ? p._id : p) === friendId
        )
    );
    if (directConv && favoriteConversations[directConv._id]) {
      return true;
    }

    return false;
  };

  // Start or switch to direct chat with a friend
  const handleStartChat = async (friendId: string) => {
    setLoadingChatUserId(friendId);
    try {
      await startDirectChat(friendId);
    } catch (err) {
      console.error('Failed to open chat with friend:', err);
    } finally {
      setLoadingChatUserId(null);
    }
  };

  // Filter friends based on search query
  const searchedFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        (f.fullName && f.fullName.toLowerCase().includes(q)) ||
        (f.username && f.username.toLowerCase().includes(q)) ||
        (f.bio && f.bio.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  // Compute counts
  const favoriteCount = useMemo(() => {
    return friends.filter((f) => isFriendFavorite(f._id)).length;
  }, [friends, favoriteContacts, favoriteConversations, conversations]);

  const onlineCount = useMemo(() => {
    return friends.filter((f) => {
      const presence = getParticipantPresence(f._id, f.status || 'offline');
      return presence.status === 'online';
    }).length;
  }, [friends, getParticipantPresence]);

  // Split into favorites and regular friends
  const favoriteFriends = useMemo(() => {
    return searchedFriends.filter((f) => isFriendFavorite(f._id));
  }, [searchedFriends, favoriteContacts, favoriteConversations, conversations]);

  const regularFriends = useMemo(() => {
    return searchedFriends.filter((f) => !isFriendFavorite(f._id));
  }, [searchedFriends, favoriteContacts, favoriteConversations, conversations]);

  // Filter by active pill tab
  const displayedFriends = useMemo(() => {
    if (activeFilter === 'favorites') {
      return favoriteFriends;
    }
    if (activeFilter === 'online') {
      return searchedFriends.filter((f) => {
        const presence = getParticipantPresence(f._id, f.status || 'offline');
        return presence.status === 'online';
      });
    }
    return searchedFriends;
  }, [activeFilter, favoriteFriends, searchedFriends, getParticipantPresence]);

  return (
    <aside className="w-full h-full bg-[#FFF0F3] border-r border-[#F7CAD0] flex flex-col z-10 flex-shrink-0 select-none overflow-hidden font-cute">
      
      {/* 1. Header Bar ("Contacts" Title) */}
      <header className="px-4.5 pt-4.5 pb-2 flex items-center justify-between flex-shrink-0">
        <h1 className="font-cute text-2xl lg:text-[27px] font-bold text-[#2D151D] tracking-tight">
          Contacts
        </h1>
      </header>

      {/* 2. Permanent Rounded Pill Search Bar */}
      <div className="px-4 py-1.5 flex-shrink-0">
        <div className="relative flex items-center w-full bg-white rounded-full border border-[#F5CAD3] shadow-2xs transition focus-within:border-[#E05375]">
          <Search className="w-4 h-4 text-[#9A707E] ml-3.5 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-transparent pl-2.5 pr-8 py-2 text-xs font-cute text-[#2D151D] placeholder:text-[#9A707E] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 text-[#9A707E] hover:text-[#7D2338] transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter Tabs Bar (All, Favorites, Online) */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-cute text-xs flex-shrink-0">
        {/* All Tab */}
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer shadow-2xs whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-[#E05375] text-white'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span>All</span>
          <span className="ml-1 opacity-80">{friends.length}</span>
        </button>

        {/* Favorites Tab */}
        <button
          type="button"
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeFilter === 'favorites'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Favorites</span>
          {favoriteCount > 0 && <span className="ml-0.5 opacity-80">{favoriteCount}</span>}
        </button>

        {/* Online Tab */}
        <button
          type="button"
          onClick={() => setActiveFilter('online')}
          className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeFilter === 'online'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Online</span>
          {onlineCount > 0 && <span className="ml-0.5 opacity-80">{onlineCount}</span>}
        </button>
      </div>

      {/* 4. Contact List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {isLoading && friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-[#9A707E] font-cute text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#E05375]" />
            <span>Loading contacts...</span>
          </div>
        ) : displayedFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#7C5362] font-cute text-xs">
            {searchQuery.trim() ? (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No contacts found</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  No friends match &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Clear search
                </button>
              </>
            ) : activeFilter === 'favorites' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-amber-500 flex items-center justify-center mb-2.5 shadow-2xs">
                  <Star className="w-6 h-6 fill-amber-500" />
                </div>
                <p className="font-bold text-sm text-[#2D151D]">No favorite contacts</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  Star your close friends to find them here quickly
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  View all contacts
                </button>
              </>
            ) : activeFilter === 'online' ? (
              <>
                <p className="font-bold text-sm text-[#2D151D]">No friends online</p>
                <p className="text-xs text-[#9A707E] mt-0.5 mb-3.5">
                  None of your contacts are currently active
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  View all contacts
                </button>
              </>
            ) : (
              <p className="font-bold text-sm text-[#2D151D]">No contacts available</p>
            )}
          </div>
        ) : activeFilter !== 'all' ? (
          /* Filtered Flat View (Favorites or Online) */
          displayedFriends.map((friend) => (
            <ContactRow
              key={friend._id}
              friend={friend}
              isFavorite={isFriendFavorite(friend._id)}
              isSelected={
                activeConversation?.type === 'direct' &&
                activeConversation.participants?.some(
                  (p) => (typeof p === 'object' ? p._id : p) === friend._id
                )
              }
              isLoadingChat={loadingChatUserId === friend._id}
              presence={getParticipantPresence(friend._id, friend.status || 'offline')}
              onSelect={() => handleStartChat(friend._id)}
              onToggleFavorite={() => toggleFavoriteContact(friend._id)}
            />
          ))
        ) : (
          /* Grouped View: Favorites Section + All Friends Section */
          <>
            {/* 1. Favorites Accordion */}
            {favoriteFriends.length > 0 && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                  className="w-full px-2.5 pt-2 pb-1 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider cursor-pointer hover:text-[#7D2338] transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Favorites ({favoriteFriends.length})</span>
                  </div>
                  {isFavoritesOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isFavoritesOpen &&
                  favoriteFriends.map((friend) => (
                    <ContactRow
                      key={friend._id}
                      friend={friend}
                      isFavorite={true}
                      isSelected={
                        activeConversation?.type === 'direct' &&
                        activeConversation.participants?.some(
                          (p) => (typeof p === 'object' ? p._id : p) === friend._id
                        )
                      }
                      isLoadingChat={loadingChatUserId === friend._id}
                      presence={getParticipantPresence(friend._id, friend.status || 'offline')}
                      onSelect={() => handleStartChat(friend._id)}
                      onToggleFavorite={() => toggleFavoriteContact(friend._id)}
                    />
                  ))}
              </div>
            )}

            {/* 2. All Friends Accordion */}
            <div className="space-y-1">
              {favoriteFriends.length > 0 && regularFriends.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsFriendsOpen(!isFriendsOpen)}
                  className="w-full px-2.5 pt-3 pb-1 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider cursor-pointer hover:text-[#7D2338] transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7D2338]" />
                    <span>All Contacts ({regularFriends.length})</span>
                  </div>
                  {isFriendsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {isFriendsOpen &&
                (favoriteFriends.length === 0 ? searchedFriends : regularFriends).map((friend) => (
                  <ContactRow
                    key={friend._id}
                    friend={friend}
                    isFavorite={isFriendFavorite(friend._id)}
                    isSelected={
                      activeConversation?.type === 'direct' &&
                      activeConversation.participants?.some(
                        (p) => (typeof p === 'object' ? p._id : p) === friend._id
                      )
                    }
                    isLoadingChat={loadingChatUserId === friend._id}
                    presence={getParticipantPresence(friend._id, friend.status || 'offline')}
                    onSelect={() => handleStartChat(friend._id)}
                    onToggleFavorite={() => toggleFavoriteContact(friend._id)}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile-Only Bottom Navigation Bar */}
      <MobileNavigation />
    </aside>
  );
};

/* Individual Contact Row Component adhering to desktop theme */
interface ContactRowProps {
  friend: User;
  isFavorite: boolean;
  isSelected?: boolean;
  isLoadingChat?: boolean;
  presence: { status: string; lastSeen?: string | Date };
  onSelect: () => void;
  onToggleFavorite: () => void;
}

const ContactRow: React.FC<ContactRowProps> = ({
  friend,
  isFavorite,
  isSelected,
  isLoadingChat,
  presence,
  onSelect,
  onToggleFavorite,
}) => {
  const isOnline = presence.status === 'online';
  const isAway = presence.status === 'away';

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition duration-150 group ${
        isSelected
          ? 'bg-[#FCDAE1] border border-[#F7BAC7] shadow-2xs'
          : 'hover:bg-[#FCEAEF] border border-transparent'
      }`}
    >
      {/* Avatar with Presence Indicator */}
      <div className="relative flex-shrink-0">
        {friend.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getMediaUrl(friend.avatar)}
            alt={friend.fullName || friend.username}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-2xs"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#FCE7EC] text-[#C24A68] text-base font-bold flex items-center justify-center font-cute ring-2 ring-white shadow-2xs">
            {(friend.fullName || friend.username).slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Loading Spinner during chat initiation */}
        {isLoadingChat && (
          <div className="absolute inset-0 rounded-full bg-black/25 backdrop-blur-2xs flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Info Block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight group-hover:text-[#9E2849] transition-colors">
            {friend.fullName || friend.username}
          </h3>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Quick Star / Favorite Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isFavorite
                  ? 'text-amber-500 hover:scale-110'
                  : 'text-[#9A707E]/40 hover:text-amber-500 group-hover:opacity-100'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 min-h-[16px]">
          {friend.bio ? (
            <p className="text-xs font-cute text-[#7C5362] truncate">
              {friend.bio}
            </p>
          ) : (
            <span />
          )}

          {isOnline ? (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-cute shrink-0">
              online
            </span>
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-[#9A707E] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};
