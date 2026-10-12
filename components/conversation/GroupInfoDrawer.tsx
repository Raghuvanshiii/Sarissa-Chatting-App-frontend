'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Pencil, 
  Check, 
  Camera, 
  Hash, 
  ShieldCheck, 
  LogOut, 
  Loader2, 
  MoreVertical,
  Trash2,
  AlertCircle,
  Crown,
  UserMinus,
  MessageSquare,
  Shield
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { apiService } from '../../services/api';
import { AddMembersModal } from './AddMembersModal';
import { User } from '../../types';

export const GroupInfoDrawer: React.FC = () => {
  const { 
    activeConversation, 
    isGroupInfoDrawerOpen, 
    closeGroupInfoDrawer, 
    updateGroupInfo,
    addGroupMembers,
    removeGroupMember,
    getParticipantPresence,
    startDirectChat
  } = useChatStore();

  const { user: currentUser } = useAuthStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<User | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeDialogError, setRemoveDialogError] = useState<string | null>(null);
  const [confirmExitGroup, setConfirmExitGroup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isGroupInfoDrawerOpen || !activeConversation || activeConversation.type !== 'group') {
    return null;
  }

  const participants = activeConversation.participants || [];
  
  // Extract admin IDs with normalization
  const adminIds = (activeConversation.admins || [])
    .map((a) => {
      if (!a) return '';
      if (typeof a === 'string') return a;
      return (a as any)._id ? String((a as any)._id) : String(a);
    })
    .filter(Boolean);

  const creatorId = activeConversation.createdBy
    ? typeof activeConversation.createdBy === 'string'
      ? activeConversation.createdBy
      : String((activeConversation.createdBy as any)._id || activeConversation.createdBy)
    : '';

  // Creator is always recognized as having admin authority
  if (creatorId && !adminIds.includes(creatorId)) {
    adminIds.push(creatorId);
  }

  const currentUserId = currentUser?._id ? String(currentUser._id) : '';
  const isCurrentUserAdmin = Boolean(currentUserId && adminIds.includes(currentUserId));

  // Filter members by search query
  const filteredParticipants = participants.filter((p) => {
    if (!searchMemberQuery.trim()) return true;
    const q = searchMemberQuery.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  // Handle Name Edit
  const startEditingName = () => {
    setEditedName(activeConversation.name || '');
    setIsEditingName(true);
    setActionError(null);
  };

  const saveGroupName = async () => {
    if (!editedName.trim() || editedName.trim() === activeConversation.name) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await updateGroupInfo(activeConversation._id, { name: editedName.trim() });
      setIsEditingName(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update group name';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Description Edit
  const startEditingDescription = () => {
    setEditedDescription(activeConversation.description || '');
    setIsEditingDescription(true);
    setActionError(null);
  };

  const saveGroupDescription = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      await updateGroupInfo(activeConversation._id, { description: editedDescription.trim() });
      setIsEditingDescription(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update description';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setActionError(null);
    try {
      const uploadRes = await apiService.uploadSingle(file);
      if (uploadRes.success && uploadRes.attachment) {
        await updateGroupInfo(activeConversation._id, { avatar: uploadRes.attachment.url });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload group avatar';
      setActionError(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Add Members
  const handleAddMembers = async (selectedIds: string[]) => {
    setActionError(null);
    const success = await addGroupMembers(activeConversation._id, selectedIds);
    if (!success) {
      throw new Error('Failed to add selected members');
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId: string) => {
    setActionError(null);
    setRemoveDialogError(null);
    setIsRemovingMember(true);
    try {
      const success = await removeGroupMember(activeConversation._id, userId);
      if (!success) {
        const errorMsg = useChatStore.getState().error || 'Failed to remove member. Only group admins have this authority.';
        setRemoveDialogError(errorMsg);
      } else {
        setConfirmRemoveUser(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      setRemoveDialogError(msg);
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Handle Exit Group
  const handleExitGroup = async () => {
    if (!currentUser) return;
    setActionError(null);
    try {
      await removeGroupMember(activeConversation._id, currentUser._id);
      setConfirmExitGroup(false);
      closeGroupInfoDrawer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to exit group';
      setActionError(msg);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={closeGroupInfoDrawer}
      >
        <div 
          className="w-full max-w-sm h-full bg-[#FFF5F7] border-l border-[#F7CAD0] shadow-[-16px_0_40px_rgba(194,74,104,0.14)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Top Header (Rose Pink Sarissa Wouts Accent) */}
          <div className="h-14 px-5 border-b border-[#F7CAD0] flex items-center justify-between bg-[#F09DAF] flex-shrink-0 shadow-2xs">
            <h2 className="text-sm font-bold text-white tracking-wide">Conversation info</h2>
            <button
              onClick={closeGroupInfoDrawer}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F7CAD0]">
            {/* Error banner if any action failed */}
            {actionError && (
              <div className="p-3 m-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Profile Hero Section */}
            <div className="p-6 flex flex-col items-center text-center bg-[#FFF0F3]/70">
              {/* Big Circular Group Avatar */}
              <div className="relative group/avatar mb-3">
                <div className="w-24 h-24 rounded-full p-1 bg-white shadow-xs border-2 border-[#F5BAC6] overflow-hidden flex items-center justify-center">
                  {activeConversation.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={activeConversation.avatar} 
                      alt={activeConversation.name}
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center font-bold text-2xl">
                      <Hash className="w-10 h-10" />
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-[#C24A68]/50 backdrop-blur-xs rounded-full flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Avatar Badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change Group Icon"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#C24A68] hover:bg-[#A23B5A] text-white shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </div>

              {/* Group Name with Inline Edit */}
              <div className="w-full flex flex-col items-center px-4">
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full max-w-xs mt-1">
                    <input 
                      type="text" 
                      autoFocus
                      maxLength={60}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveGroupName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-[#C24A68] text-sm font-semibold text-[#2D151D] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={saveGroupName}
                      className="p-2 rounded-xl bg-[#C24A68] text-white hover:bg-[#B83253] transition cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-2 rounded-xl border border-[#F5BAC6] text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 group cursor-pointer max-w-full">
                    <h3 
                      onClick={startEditingName}
                      className="text-base font-bold text-[#2D151D] break-words hover:text-[#C24A68] transition"
                      title="Click to edit group name"
                    >
                      {activeConversation.name || 'Group Conversation'}
                    </h3>
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="p-1 rounded-lg text-[#7C5362] hover:text-[#C24A68] transition cursor-pointer"
                      title="Edit group name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Member count subtitle */}
                <p className="text-xs text-[#7C5362] mt-1 flex items-center gap-1">
                  <span>Group</span>
                  <span>·</span>
                  <span className="text-[#C24A68] font-bold">
                    {participants.length} {participants.length === 1 ? 'member' : 'members'}
                  </span>
                </p>
              </div>

              {/* Action Buttons: "Add" & "Search" */}
              <div className="flex items-center justify-center gap-6 mt-5">
                {/* Add Member Button */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#FCE7EC] hover:bg-[#F8BAC8] border border-[#F5BAC6] shadow-2xs flex items-center justify-center text-[#C24A68] transition-all group-hover:scale-105 active:scale-95">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] text-[#7C5362] group-hover:text-[#2D151D] font-bold transition">
                    Add
                  </span>
                </button>

                {/* Search in Group Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchActive(!isSearchActive);
                    if (isSearchActive) setSearchMemberQuery('');
                  }}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-2xl border shadow-2xs flex items-center justify-center transition-all group-hover:scale-105 active:scale-95 ${
                    isSearchActive
                      ? 'bg-[#C24A68] border-[#C24A68] text-white shadow-xs'
                      : 'bg-[#FCE7EC] hover:bg-[#F8BAC8] border-[#F5BAC6] text-[#C24A68]'
                  }`}>
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="text-[12px] text-[#7C5362] group-hover:text-[#2D151D] font-bold transition">
                    Search
                  </span>
                </button>
              </div>
            </div>

            {/* Group Description Section */}
            <div className="p-5 bg-[#FFF5F7]">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#7C5362]">
                    <span className="font-bold text-[#2D151D]">Group description</span>
                    <span>{editedDescription.length}/500</span>
                  </div>
                  <textarea
                    autoFocus
                    maxLength={500}
                    rows={3}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Add description so members know what this group is about..."
                    className="w-full p-3 rounded-xl bg-white border border-[#C24A68] text-xs text-[#2D151D] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="py-1.5 px-3 rounded-lg border border-[#F5BAC6] text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={saveGroupDescription}
                      className="py-1.5 px-4 rounded-lg bg-[#C24A68] text-white text-xs font-bold hover:bg-[#B83253] transition cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={startEditingDescription}
                  className="flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex-1">
                    {activeConversation.description ? (
                      <div>
                        <span className="text-[12px] font-bold text-[#A23B5A] uppercase tracking-wider block mb-1">
                          Group Description
                        </span>
                        <p className="text-xs text-[#2D151D] whitespace-pre-wrap leading-relaxed">
                          {activeConversation.description}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#C24A68] group-hover:underline">
                        Add group description
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={startEditingDescription}
                    className="p-1 rounded-lg text-[#7C5362] group-hover:text-[#C24A68] transition cursor-pointer flex-shrink-0"
                    title="Edit description"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Search Input Filter for Group Members */}
            {isSearchActive && (
              <div className="p-4 bg-[#FFF0F3] border-b border-[#F7CAD0] animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                  <input
                    type="text"
                    autoFocus
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search people in this group..."
                    className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#B591A0]"
                  />
                  {searchMemberQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchMemberQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B591A0] hover:text-[#C24A68] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Members List Section */}
            <div className="p-5 bg-[#FFF5F7]">
              <div className="flex items-center justify-between pb-3">
                <h4 className="text-xs font-bold text-[#A23B5A] uppercase tracking-wider">
                  {participants.length} {participants.length === 1 ? 'Member' : 'Members'}
                </h4>
                {searchMemberQuery && (
                  <span className="text-[12px] text-[#7C5362] font-mono">
                    {filteredParticipants.length} found
                  </span>
                )}
              </div>

              {/* Admin Authority Banner */}
              {isCurrentUserAdmin && (
                <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#9F2241] text-xs flex items-center gap-2.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-[#C24A68]" />
                  <span className="leading-snug">
                    You have <strong>Admin Authority</strong> to add and remove members from this group.
                  </span>
                </div>
              )}

              {/* Quick "Add members" Action Row */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full p-2.5 mb-2 rounded-2xl bg-white hover:bg-[#FFEBF0]/60 border border-[#F5BAC6] flex items-center gap-3 transition shadow-2xs cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-[#C24A68] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="text-left min-w-0">
                  <h5 className="text-xs font-bold text-[#2D151D]">Add members</h5>
                  <p className="text-[12px] text-[#7C5362]">Invite people to this group</p>
                </div>
              </button>

              {/* Members List Items */}
              <div className="space-y-1.5 mt-2">
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#B591A0]">
                    No members match &ldquo;{searchMemberQuery}&rdquo;
                  </div>
                ) : (
                  filteredParticipants.map((member) => {
                    const memberId = String(member._id);
                    const isMemberAdmin = adminIds.includes(memberId);
                    const isCurrentMember = currentUserId === memberId;
                    const isMemberCreator = Boolean(creatorId && creatorId === memberId);
                    const presence = getParticipantPresence(member._id, member.status);

                    return (
                      <div
                        key={member._id}
                        className="p-2.5 rounded-2xl bg-white hover:bg-[#FFEBF0]/60 border border-[#F5BAC6] flex items-center justify-between gap-3 transition shadow-2xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar with Presence Indicator */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full p-0.5 bg-white shadow-2xs border border-[#F5BAC6] overflow-hidden">
                              {member.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={member.avatar}
                                  alt={member.fullName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center font-bold text-xs">
                                  {member.fullName?.slice(0, 2).toUpperCase() || 'MB'}
                                </div>
                              )}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                                presence.status === 'online'
                                  ? 'bg-emerald-500'
                                  : presence.status === 'away'
                                  ? 'bg-amber-500'
                                  : 'bg-zinc-400'
                              }`}
                              title={`Status: ${presence.status}`}
                            />
                          </div>

                          {/* Member info & Role Badges */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="text-xs font-bold text-[#2D151D] truncate">
                                {member.fullName}
                              </h5>
                              {isCurrentMember && (
                                <span className="text-[11px] py-0.5 px-1.5 rounded-full bg-[#FCE7EC] text-[#C24A68] font-bold">
                                  You
                                </span>
                              )}
                              {isMemberCreator ? (
                                <span className="text-[11px] py-0.5 px-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1" title="Group Creator">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  <span>Creator</span>
                                </span>
                              ) : isMemberAdmin ? (
                                <span className="text-[11px] py-0.5 px-2 rounded-full bg-[#FCE7EC] text-[#9F2241] border border-[#F5BAC6] font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-[#C24A68]" />
                                  <span>Admin</span>
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[12px] text-[#7C5362] truncate">
                              @{member.username}
                            </p>
                          </div>
                        </div>

                        {/* Member Actions: Direct Message & Admin Removal */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Direct Message shortcut */}
                          {!isCurrentMember && (
                            <button
                              type="button"
                              onClick={() => {
                                startDirectChat(member._id);
                                closeGroupInfoDrawer();
                              }}
                              className="p-1.5 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
                              title={`Message @${member.username}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* Admin Authority: Remove Button */}
                          {isCurrentUserAdmin && !isCurrentMember && (
                            isMemberCreator ? (
                              <span 
                                className="p-1.5 rounded-xl text-amber-500/70"
                                title="Creator cannot be removed"
                              >
                                <Shield className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setRemoveDialogError(null);
                                  setConfirmRemoveUser(member);
                                }}
                                className="px-2.5 py-1 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                                title={`Remove ${member.fullName} from group`}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Exit / Leave Group Section */}
            <div className="p-5 bg-[#FFF5F7]">
              <button
                type="button"
                onClick={() => setConfirmExitGroup(true)}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Group</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentParticipantIds={participants.map((p) => p._id)}
        groupName={activeConversation.name}
        onAddMembers={handleAddMembers}
      />

      {/* Confirm Remove Member Dialog (Admin Authority) */}
      {confirmRemoveUser && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            if (!isRemovingMember) {
              setConfirmRemoveUser(null);
              setRemoveDialogError(null);
            }
          }}
        >
          <div 
            className="w-full max-w-sm bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBF0] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center mb-4 shadow-2xs">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FCE7EC] text-[#9F2241]">
                Admin Authority Action
              </span>
            </div>

            <h3 className="text-base font-bold text-[#2D151D]">
              Remove from Group?
            </h3>

            {/* Error banner if removal failed */}
            {removeDialogError && (
              <div className="mt-3 p-3 rounded-xl bg-[#FFEBF0] border border-[#F5BAC6] text-[#9F2241] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{removeDialogError}</span>
              </div>
            )}

            {/* Target user summary preview */}
            <div className="mt-3 p-3 rounded-2xl bg-white/80 border border-[#F5BAC6] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FCE7EC] text-[#C24A68] border border-[#F5BAC6] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                {confirmRemoveUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={confirmRemoveUser.avatar} alt={confirmRemoveUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  confirmRemoveUser.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-bold text-[#2D151D] truncate">{confirmRemoveUser.fullName}</h5>
                <p className="text-[12px] text-[#7C5362] truncate">@{confirmRemoveUser.username}</p>
              </div>
            </div>

            <p className="text-xs text-[#7C5362] mt-3 leading-relaxed">
              Are you sure you want to remove <strong className="text-[#2D151D]">{confirmRemoveUser.fullName}</strong> from <strong className="text-[#2D151D]">{activeConversation.name}</strong>? They will immediately lose access to all messages and media in this group.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                disabled={isRemovingMember}
                onClick={() => {
                  setConfirmRemoveUser(null);
                  setRemoveDialogError(null);
                }}
                className="py-2 px-4 rounded-xl border border-[#F5BAC6] text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemovingMember}
                onClick={() => handleRemoveMember(confirmRemoveUser._id)}
                className="py-2 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-70"
              >
                {isRemovingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRemovingMember ? 'Removing...' : 'Remove Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Exit Group Dialog */}
      {confirmExitGroup && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setConfirmExitGroup(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBF0] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#2D151D]">
              Exit this group?
            </h3>
            <p className="text-xs text-[#7C5362] mt-1.5 leading-relaxed">
              You will no longer receive messages or be able to send messages to <strong className="text-[#2D151D]">{activeConversation.name}</strong>.
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setConfirmExitGroup(false)}
                className="py-2 px-4 rounded-xl border border-[#F5BAC6] text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExitGroup}
                className="py-2 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                Exit Group
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
