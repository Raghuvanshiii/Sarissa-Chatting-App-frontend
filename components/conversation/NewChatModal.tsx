'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  MessageSquare, 
  Loader2, 
  Users, 
  Sparkles
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';

export const NewChatModal: React.FC = () => {
  const { 
    isNewChatModalOpen, 
    closeNewChatModal, 
    openCreateGroupModal,
    searchResults, 
    isSearching, 
    searchUsers, 
    startDirectChat 
  } = useChatStore();

  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isStartingChatWithId, setIsStartingChatWithId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    if (!isNewChatModalOpen) return;

    const timer = setTimeout(() => {
      searchUsers(searchTerm.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isNewChatModalOpen, searchUsers]);

  if (!isNewChatModalOpen) return null;

  const handleStartChat = async (recipientId: string) => {
    setIsStartingChatWithId(recipientId);
    try {
      await startDirectChat(recipientId);
    } finally {
      setIsStartingChatWithId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeNewChatModal}
    >
      <div 
        className="w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden transition-all max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F7CAD0] flex items-center justify-between bg-white/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] text-[#C24A68] border border-[#F5BAC6] flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D151D]">
                New Conversation
              </h2>
              <p className="text-xs text-[#7C5362] mt-0.5">
                Search directory by name, @username, or email
              </p>
            </div>
          </div>
          <button
            onClick={closeNewChatModal}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-3.5 border-b border-[#F7CAD0] bg-[#FFF0F3]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, @username, or email..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] focus:ring-2 focus:ring-[#C24A68]/20 text-[#2D151D] placeholder:text-[#B591A0] shadow-2xs transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B591A0] hover:text-[#C24A68] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Create New Group Action */}
        <div className="p-3 border-b border-[#F7CAD0] bg-[#FFF5F7]">
          <button
            type="button"
            onClick={() => {
              closeNewChatModal();
              openCreateGroupModal();
            }}
            className="w-full p-3 rounded-2xl bg-[#FFEBF0]/70 hover:bg-[#FCE7EC] border border-[#F5BAC6] flex items-center justify-between gap-3 transition cursor-pointer text-left group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D151D] flex items-center gap-1.5">
                  <span>Create New Group</span>
                </h4>
                <p className="text-[12px] text-[#7C5362]">
                  Collaborate with multiple members, share files and polls
                </p>
              </div>
            </div>
            <div className="text-[#C24A68] pr-1 group-hover:translate-x-0.5 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-[#FFF5F7]">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#B591A0] gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#C24A68]" />
              <p className="text-xs text-[#7C5362]">Searching directory...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#B591A0] px-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] flex items-center justify-center text-[#C24A68] mb-2 shadow-2xs">
                <Users className="w-5 h-5 stroke-[1.8]" />
              </div>
              <p className="text-xs font-bold text-[#2D151D]">
                {searchTerm ? 'No users found' : 'No recommendations available'}
              </p>
              <p className="text-[12px] text-[#7C5362] mt-1 max-w-xs">
                {searchTerm
                  ? `No matches for "${searchTerm}". Try a different name, username, or email.`
                  : 'Start a direct chat with registered colleagues.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="px-2 pb-1 text-[12px] font-bold text-[#7C5362] uppercase tracking-wider flex items-center justify-between">
                <span>{searchTerm ? 'Search Results' : 'Recommended People'}</span>
                <span className="text-[11px] text-[#A23B5A] font-mono">{searchResults.length} found</span>
              </div>

              {searchResults.map((targetUser) => {
                const isSelected = isStartingChatWithId === targetUser._id;

                return (
                  <div
                    key={targetUser._id}
                    className="p-2.5 rounded-2xl bg-white hover:bg-[#FFEBF0]/60 border border-[#F5BAC6] flex items-center justify-between gap-3 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {targetUser.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={targetUser.avatar}
                            alt={targetUser.fullName}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#F5BAC6]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center font-bold text-xs ring-2 ring-[#F5BAC6]">
                            {targetUser.fullName ? targetUser.fullName.slice(0, 2).toUpperCase() : 'US'}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            targetUser.status === 'online'
                              ? 'bg-emerald-500'
                              : targetUser.status === 'away'
                              ? 'bg-amber-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[#2D151D] truncate">
                            {targetUser.fullName}
                          </h4>
                          <span className="text-[11px] text-[#A23B5A] font-mono">
                            @{targetUser.username}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#7C5362] truncate">
                          {targetUser.bio || targetUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleStartChat(targetUser._id)}
                      className="flex-shrink-0 py-1.5 px-3.5 rounded-xl bg-[#C24A68] hover:bg-[#B83253] active:bg-[#9F2241] text-white text-xs font-bold shadow-md shadow-[#C24A68]/20 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSelected ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
