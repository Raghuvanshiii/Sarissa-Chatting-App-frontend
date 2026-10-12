'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Check, 
  Loader2, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { apiService } from '../../services/api';
import { User } from '../../types';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParticipantIds: string[];
  groupName?: string;
  onAddMembers: (selectedIds: string[]) => Promise<void>;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  currentParticipantIds,
  groupName,
  onAddMembers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedUserIds([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiService.searchUsers(searchTerm.trim());
        // Filter out users who are already in the group
        const existingSet = new Set(currentParticipantIds);
        const filtered = res.users.filter((u) => !existingSet.has(u._id));
        setAvailableUsers(filtered);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to search users';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm, currentParticipantIds]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const removeSelected = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onAddMembers(selectedUserIds);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add members';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUsers = availableUsers.filter((u) => selectedUserIds.includes(u._id));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden transition-all max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F7CAD0] flex items-center justify-between bg-white/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2D151D]">Add Members</h2>
              <p className="text-xs text-[#7C5362]">
                to <span className="font-bold text-[#2D151D]">{groupName || 'Group'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Users Chips Tray */}
        {selectedUsers.length > 0 && (
          <div className="px-5 py-3 border-b border-[#F7CAD0] bg-white flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedUsers.map((u) => (
              <span
                key={u._id}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-xs font-semibold bg-[#FCE7EC] text-[#9F2241] border border-[#F5BAC6] shadow-2xs animate-in zoom-in-90 duration-150"
              >
                <span className="w-4 h-4 rounded-full bg-[#C24A68] text-white text-[10px] flex items-center justify-center font-bold">
                  {u.fullName?.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate max-w-[100px]">{u.fullName}</span>
                <button
                  type="button"
                  onClick={() => removeSelected(u._id)}
                  className="hover:text-rose-600 rounded-full cursor-pointer ml-0.5 text-[#C24A68]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-[#F7CAD0] bg-[#FFF0F3]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, @username, or email..."
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#B591A0] transition"
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

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px] bg-[#FFF5F7]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#B591A0] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#C24A68]" />
              <p className="text-xs text-[#7C5362]">Searching users...</p>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#B591A0] px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] flex items-center justify-center text-[#C24A68] mb-2 shadow-2xs">
                <Users className="w-6 h-6 stroke-1.5" />
              </div>
              <p className="text-xs font-bold text-[#2D151D]">
                {searchTerm ? 'No new users match search' : 'No new members available to add'}
              </p>
              <p className="text-[12px] text-[#7C5362] mt-1 max-w-xs">
                {searchTerm
                  ? `No matches for "${searchTerm}". Try another name or username.`
                  : 'All registered users in the directory are already part of this group!'}
              </p>
            </div>
          ) : (
            availableUsers.map((targetUser) => {
              const isSelected = selectedUserIds.includes(targetUser._id);

              return (
                <div
                  key={targetUser._id}
                  onClick={() => toggleUserSelection(targetUser._id)}
                  className={`p-3 rounded-2xl border transition shadow-2xs flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#FCE7EC] border-[#C24A68]'
                      : 'bg-white hover:bg-[#FFEBF0]/60 border-[#F5BAC6]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full p-0.5 bg-white shadow-2xs border border-[#F5BAC6] overflow-hidden">
                        {targetUser.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={targetUser.avatar}
                            alt={targetUser.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center font-bold text-xs">
                            {targetUser.fullName ? targetUser.fullName.slice(0, 2).toUpperCase() : 'US'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#2D151D] truncate">
                          {targetUser.fullName}
                        </h4>
                        <span className="text-[12px] text-[#A23B5A] font-mono">
                          @{targetUser.username}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#7C5362] truncate">
                        {targetUser.bio || targetUser.email}
                      </p>
                    </div>
                  </div>

                  {/* Circular Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-[#C24A68] border-transparent text-white shadow-2xs'
                        : 'border-[#F5BAC6] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#F7CAD0] bg-[#FFF0F3] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-[#F5BAC6] text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={selectedUserIds.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="py-2.5 px-6 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-md shadow-[#C24A68]/25 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
