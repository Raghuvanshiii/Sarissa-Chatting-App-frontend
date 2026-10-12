'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Building, 
  Send, 
  Check, 
  Sparkles,
  Users
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { User } from '../../types';

export interface ContactData {
  _type: 'contact';
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  avatar?: string;
  userId?: string;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendContact: (contact: ContactData) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onSendContact,
}) => {
  const { user: currentUser } = useAuthStore();
  const { activeConversation, conversations } = useChatStore();

  const [mode, setMode] = useState<'users' | 'manual'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Manual fields
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualOrg, setManualOrg] = useState('');

  // Collect known users from conversations
  useEffect(() => {
    if (!isOpen) return;

    // Reset selection and inputs
    setSelectedUser(null);
    setSearchQuery('');
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setManualOrg('');

    // Gather distinct users from conversation list
    const userMap = new Map<string, User>();
    conversations.forEach((c) => {
      c.participants?.forEach((p) => {
        if (p._id !== currentUser?._id) {
          userMap.set(p._id, p);
        }
      });
    });

    setAvailableUsers(Array.from(userMap.values()));
  }, [isOpen, conversations, currentUser?._id]);

  // Handle live search
  const filteredUsers = availableUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  const handleSend = () => {
    if (mode === 'users') {
      if (!selectedUser) return;
      onSendContact({
        _type: 'contact',
        name: selectedUser.fullName || selectedUser.username,
        email: selectedUser.email,
        avatar: selectedUser.avatar,
        userId: selectedUser._id,
      });
    } else {
      if (!manualName.trim()) return;
      onSendContact({
        _type: 'contact',
        name: manualName.trim(),
        phone: manualPhone.trim() || undefined,
        email: manualEmail.trim() || undefined,
        organization: manualOrg.trim() || undefined,
      });
    }
    onClose();
  };

  const isSendDisabled =
    mode === 'users' ? !selectedUser : !manualName.trim();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-[#2D151D]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D151D]">
                Share Contact
              </h2>
              <p className="text-xs text-[#7C5362]">
                Send contact details into the chat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#F5BAC6] bg-[#FFEBF0]/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setMode('users')}
            className={`flex-1 py-2 text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'users'
                ? 'bg-[#C24A68] text-white shadow-xs font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Chat Contacts</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'manual'
                ? 'bg-[#C24A68] text-white shadow-xs font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Custom Contact</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mode === 'users' ? (
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]"
                />
              </div>

              {/* Users list */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#7C5362] text-xs">
                    No contacts found. Use &quot;Custom Contact&quot; to enter details.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?._id === u._id;
                    return (
                      <div
                        key={u._id}
                        onClick={() => setSelectedUser(isSelected ? null : u)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-[#FCE7EC] border border-[#C24A68]/50 shadow-xs'
                            : 'hover:bg-white/80 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#FFEBF0] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {u.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={u.avatar}
                                alt={u.fullName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              u.fullName.slice(0, 2)
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#2D151D]">
                              {u.fullName}
                            </p>
                            <p className="text-[12px] text-[#7C5362]">
                              @{u.username} &bull; {u.email}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#C24A68] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2D151D] mb-1">
                  Full Name <span className="text-[#C24A68]">*</span>
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D151D] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D151D] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D151D] mb-1">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="text"
                    value={manualOrg}
                    onChange={(e) => setManualOrg(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Card Preview */}
          <div className="mt-4 pt-3 border-t border-[#F5BAC6]">
            <p className="text-[12px] font-bold text-[#7C5362] uppercase tracking-wider mb-2">
              Preview Card
            </p>
            <div className="p-3 rounded-xl bg-white/80 border border-[#F5BAC6] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFEBF0] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center font-bold text-sm shadow-xs">
                  {(mode === 'users' ? selectedUser?.fullName : manualName)?.slice(0, 2).toUpperCase() || '??'}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2D151D]">
                    {(mode === 'users' ? selectedUser?.fullName : manualName) || 'Contact Name'}
                  </p>
                  <p className="text-[12px] text-[#7C5362]">
                    {(mode === 'users'
                      ? selectedUser?.email
                      : manualPhone || manualEmail || manualOrg) || 'Contact details'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#C24A68] bg-[#FCE7EC] border border-[#F5BAC6] px-2.5 py-0.5 rounded-full">
                Contact Card
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#F5BAC6] flex items-center justify-end gap-2 bg-[#FFEBF0]/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-[#7C5362] hover:bg-[#FCE7EC] border border-[#F5BAC6] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSendDisabled}
            onClick={handleSend}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#C24A68] hover:bg-[#B83253] text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
};
