'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Users, 
  Check, 
  Camera, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { apiService } from '../../services/api';
import { User } from '../../types';

export const CreateGroupModal: React.FC = () => {
  const { 
    isCreateGroupModalOpen, 
    closeCreateGroupModal, 
    searchResults, 
    isSearching, 
    searchUsers, 
    createGroup 
  } = useChatStore();

  const { user: currentUser } = useAuthStore();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupAvatar, setGroupAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search users on mount and query changes
  useEffect(() => {
    if (!isCreateGroupModalOpen) return;
    const timer = setTimeout(() => {
      searchUsers(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, isCreateGroupModalOpen, searchUsers]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isCreateGroupModalOpen) {
      setGroupName('');
      setGroupDescription('');
      setSearchTerm('');
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setGroupAvatar('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isCreateGroupModalOpen]);

  if (!isCreateGroupModalOpen) return null;

  // Filter out current user from candidate search results
  const availableUsers = searchResults.filter(
    (u) => u._id !== currentUser?._id
  );

  // Toggle user selection
  const handleToggleUser = (user: User) => {
    setErrorMessage(null);
    if (selectedUserIds.includes(user._id)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== user._id));
      setSelectedUsers((prev) => prev.filter((u) => u._id !== user._id));
    } else {
      setSelectedUserIds((prev) => [...prev, user._id]);
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  // Remove user via pill chip
  const handleRemoveUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5 MB');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);
    try {
      const data = await apiService.uploadSingle(file);
      if (data && data.attachment && data.attachment.url) {
        setGroupAvatar(data.attachment.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload group avatar';
      setErrorMessage(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Submit create group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a group name');
      return;
    }

    if (trimmedName.length > 60) {
      setErrorMessage('Group name cannot exceed 60 characters');
      return;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage('Please select at least 1 participant to join the group');
      return;
    }

    setIsSubmitting(true);
    try {
      const conv = await createGroup({
        name: trimmedName,
        description: groupDescription.trim() || undefined,
        participantIds: selectedUserIds,
        avatar: groupAvatar || undefined,
      });

      if (!conv) {
        setErrorMessage('Failed to create group. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeCreateGroupModal}
    >
      <div 
        className="w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden transition-all max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F7CAD0] flex items-center justify-between bg-white/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] text-[#C24A68] border border-[#F5BAC6] flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D151D]">
                Create New Group
              </h2>
              <p className="text-xs text-[#7C5362] mt-0.5">
                Add members to start a collaborative conversation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCreateGroupModal}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span className="font-medium flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden">
          {/* Group Details: Avatar & Subject Name */}
          <div className="p-4 border-b border-[#F7CAD0] bg-[#FFF0F3] space-y-3.5">
            <div className="flex items-center gap-4">
              {/* Group Avatar Picker */}
              <div className="relative flex-shrink-0">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="relative w-12 h-12 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center cursor-pointer group hover:opacity-90 transition-all overflow-hidden shadow-2xs"
                  title="Upload group icon"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : groupAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={groupAvatar} 
                      alt="Group Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Users className="w-6 h-6 stroke-[1.8]" />
                  )}

                  {/* Camera overlay indicator */}
                  <div className="absolute inset-0 bg-[#C24A68]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </button>
              </div>

              {/* Group Subject Name Input */}
              <div className="flex-1">
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name (e.g. Design collective)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] focus:ring-2 focus:ring-[#C24A68]/20 text-[#2D151D] placeholder:text-[#B591A0] shadow-2xs transition font-semibold"
                />
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <input
                type="text"
                maxLength={200}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Optional group description or purpose..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] focus:ring-2 focus:ring-[#C24A68]/20 text-[#2D151D] placeholder:text-[#B591A0] shadow-2xs transition"
              />
            </div>
          </div>

          {/* Selected Member Chips Tray */}
          {selectedUsers.length > 0 && (
            <div className="p-3 border-b border-[#F7CAD0] bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[12px] font-bold text-[#7C5362] flex-shrink-0 mr-1 uppercase tracking-wider">
                Selected:
              </span>
              {selectedUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#FCE7EC] border border-[#F5BAC6] text-[#9F2241] text-xs shrink-0"
                >
                  <span className="font-semibold">{u.fullName.split(' ')[0]}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(u._id)}
                    className="p-0.5 rounded hover:bg-[#F5BAC6] text-[#C24A68] transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Member Input */}
          <div className="p-3 border-b border-[#F7CAD0] bg-[#FFF5F7]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter colleagues to invite..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] focus:ring-2 focus:ring-[#C24A68]/20 text-[#2D151D] placeholder:text-[#B591A0] shadow-2xs transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B591A0] hover:text-[#C24A68] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Member Selection List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#FFF5F7]">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#B591A0] gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C24A68]" />
                <p className="text-xs text-[#7C5362]">Loading people...</p>
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-[#B591A0] px-4">
                <p className="text-xs text-[#7C5362]">No other members found in the directory</p>
              </div>
            ) : (
              availableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);

                return (
                  <div
                    key={u._id}
                    onClick={() => handleToggleUser(u)}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition select-none shadow-2xs ${
                      isSelected
                        ? 'bg-[#FCE7EC] border-[#C24A68]'
                        : 'bg-white hover:bg-[#FFEBF0]/60 border-[#F5BAC6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar}
                            alt={u.fullName}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-[#F5BAC6]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#FCE7EC] text-[#C24A68] text-xs font-bold flex items-center justify-center ring-2 ring-[#F5BAC6]">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            u.status === 'online'
                              ? 'bg-emerald-500'
                              : u.status === 'away'
                              ? 'bg-amber-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#2D151D] truncate">
                          {u.fullName}
                        </h4>
                        <p className="text-[11px] text-[#A23B5A] font-mono truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>

                    {/* Circular Checkbox */}
                    <div 
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#C24A68] text-white shadow-2xs'
                          : 'border border-[#F5BAC6] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-[#F7CAD0] bg-[#FFF0F3] flex items-center justify-between gap-3">
            <span className="text-xs text-[#7C5362]">
              {selectedUserIds.length === 0 ? (
                <span>No members chosen</span>
              ) : (
                <span className="font-bold text-[#2D151D]">
                  {selectedUserIds.length} member{selectedUserIds.length > 1 ? 's' : ''} chosen
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeCreateGroupModal}
                disabled={isSubmitting}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
                className="py-2 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-bold text-xs tracking-wide shadow-md shadow-[#C24A68]/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
