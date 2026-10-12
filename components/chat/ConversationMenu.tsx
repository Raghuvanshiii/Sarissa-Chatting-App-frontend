'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Users,
  CheckSquare,
  BellOff,
  Bell,
  Clock,
  Trash2,
  Download,
  X,
  AlertTriangle,
  Mail,
  Calendar,
  Sparkles,
  FileText,
  Palette,
  Star,
} from 'lucide-react';
import { Conversation, User as UserType, Message } from '../../types';
import { useWallpaperStore } from '../../store/useWallpaperStore';
import { useAppStore } from '../../store/useAppStore';

interface ConversationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  activeConversation: Conversation;
  recipient: UserType | null;
  messages: Message[];
  onToggleSelectMode: () => void;
  onToggleSearch?: () => void;
  onClearChat: () => void;
  onCloseChat: () => void;
  isMuted?: boolean;
  onToggleMute: (duration: '8h' | '1w' | 'always' | 'unmute') => void;
  disappearingTimer?: string;
  onSetDisappearingTimer: (timer: 'off' | '24h' | '7d' | '90d') => void;
  onOpenGroupInfo?: () => void;
  onOpenWallpaper?: () => void;
}

export const ConversationMenu: React.FC<ConversationMenuProps> = ({
  isOpen,
  onClose,
  anchorRef,
  activeConversation,
  recipient,
  messages,
  onToggleSelectMode,
  onToggleSearch,
  onClearChat,
  onCloseChat,
  isMuted = false,
  onToggleMute,
  disappearingTimer = 'off',
  onSetDisappearingTimer,
  onOpenGroupInfo,
  onOpenWallpaper,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { favoriteConversations, toggleFavoriteConversation } = useAppStore();
  const isFavorite = Boolean(favoriteConversations[activeConversation._id]);
  const [activeModal, setActiveModal] = useState<
    'none' | 'contact_info' | 'mute' | 'disappearing' | 'clear_confirm'
  >('none');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on click outside (respecting trigger button ref)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (anchorRef?.current && anchorRef.current.contains(target)) {
        return;
      }
      if (activeModal === 'none') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose, activeModal, anchorRef]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModal !== 'none') {
          setActiveModal('none');
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen || activeModal !== 'none') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeModal]);

  // Handle Export Chat (WhatsApp .txt transcript download)
  const handleExportChat = () => {
    const title = recipient?.fullName || activeConversation.name || 'Chat';
    const lines: string[] = [
      `========================================`,
      `WhatsApp Chat History with ${title}`,
      `Exported on: ${new Date().toLocaleString()}`,
      `Total Messages: ${messages.length}`,
      `========================================\n`,
    ];

    messages.forEach((msg) => {
      const time = new Date(msg.createdAt).toLocaleString();
      const sender =
        typeof msg.senderId === 'object' && msg.senderId !== null
          ? (msg.senderId as { fullName?: string; username?: string }).fullName || 'User'
          : 'User';
      lines.push(`[${time}] ${sender}: ${msg.content || (msg.attachments?.length ? '[Attachment]' : '')}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WhatsApp Chat - ${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  if (!isOpen && activeModal === 'none') return null;

  return (
    <>
      {/* Three Dots Dropdown Menu Popover */}
      {isOpen && activeModal === 'none' && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-2 z-50 w-60 py-1.5 bg-[#FFF5F7] rounded-2xl shadow-2xl border border-[#F5BAC6] text-xs font-semibold text-[#2D151D] animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Section 1: Overview */}
          <div className="py-1">
            {/* Contact / Group Info */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                if (activeConversation.type === 'group' && onOpenGroupInfo) {
                  onOpenGroupInfo();
                } else {
                  useAppStore.getState().toggleDetailsPanel();
                }
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              {activeConversation.type === 'direct' ? (
                <User className="w-4 h-4 text-[#C24A68]" />
              ) : (
                <Users className="w-4 h-4 text-[#C24A68]" />
              )}
              <span>{activeConversation.type === 'direct' ? 'Contact info' : 'Group info'}</span>
            </button>
          </div>

          <div className="border-t border-[#F5BAC6]/50" />

          {/* Section 2: Chat Settings */}
          <div className="py-1">
            {/* Mute Notifications */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal('mute');
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <div className="flex items-center gap-3">
                {isMuted ? (
                  <Bell className="w-4 h-4 text-[#C24A68]" />
                ) : (
                  <BellOff className="w-4 h-4 text-[#7C5362]" />
                )}
                <span>{isMuted ? 'Muted' : 'Mute notifications'}</span>
              </div>
              {isMuted && (
                <span className="text-[11px] font-bold text-[#C24A68] bg-[#FCE7EC] px-1.5 py-0.5 rounded-md">
                  Muted
                </span>
              )}
            </button>

            {/* Add to / Remove from Favourites */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavoriteConversation(activeConversation._id);
                onClose();
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <div className="flex items-center gap-3">
                <Star
                  className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#7C5362]'
                    }`}
                />
                <span>{isFavorite ? 'Remove from favourites' : 'Add to favourites'}</span>
              </div>
              {isFavorite && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md">
                  Favorited
                </span>
              )}
            </button>

            {/* Disappearing Messages */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal('disappearing');
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#7C5362]" />
                <span>Disappearing messages</span>
              </div>
              {disappearingTimer !== 'off' && (
                <span className="text-[11px] font-bold text-[#C24A68] uppercase bg-[#FCE7EC] px-1.5 py-0.5 rounded-md">
                  {disappearingTimer}
                </span>
              )}
            </button>

            {/* Chat Wallpaper */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                if (onOpenWallpaper) {
                  onOpenWallpaper();
                } else {
                  useWallpaperStore.getState().openWallpaperModal(activeConversation._id);
                }
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <Palette className="w-4 h-4 text-[#7C5362]" />
              <span>Chat wallpaper</span>
            </button>
          </div>

          <div className="border-t border-[#F5BAC6]/50" />

          {/* Section 3: Tools & Actions */}
          <div className="py-1">
            {/* Select Messages */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelectMode();
                onClose();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <CheckSquare className="w-4 h-4 text-[#7C5362]" />
              <span>Select messages</span>
            </button>

            {/* Export Chat */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExportChat();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#2D151D]"
            >
              <Download className="w-4 h-4 text-[#7C5362]" />
              <span>Export chat</span>
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal('clear_confirm');
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FFEBF0] text-[#9F2241] transition text-left cursor-pointer font-bold"
            >
              <Trash2 className="w-4 h-4 text-[#C24A68]" />
              <span>Clear chat</span>
            </button>

            {/* Close Chat */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseChat();
                onClose();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#FCE7EC] transition text-left cursor-pointer text-[#7C5362]"
            >
              <X className="w-4 h-4" />
              <span>Close chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: WhatsApp Contact Info Drawer / Modal (Portaled) */}
      {mounted && activeModal === 'contact_info' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setActiveModal('none');
            onClose();
          }}
        >
          <div
            className="w-full max-w-sm bg-[#FFF5F7] rounded-3xl border border-[#F5BAC6] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5BAC6] bg-[#FFEBF0]/70">
              <h3 className="text-sm font-bold text-[#2D151D]">Contact info</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  onClose();
                }}
                className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Name */}
            <div className="p-6 flex flex-col items-center text-center border-b border-[#F5BAC6] bg-[#FFEBF0]/40">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg ring-4 ring-[#C24A68]/20 mb-3 flex items-center justify-center bg-gradient-to-tr from-[#C24A68] to-[#E07A93] text-white font-bold text-2xl">
                {recipient?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipient.avatar}
                    alt={recipient.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{recipient?.fullName?.slice(0, 2).toUpperCase() || 'U'}</span>
                )}
              </div>
              <h4 className="text-lg font-bold text-[#2D151D]">
                {recipient?.fullName || activeConversation.name}
              </h4>
            </div>

            {/* Details List */}
            <div className="p-4 space-y-3 divide-y divide-[#F5BAC6]/60">
              {recipient?.bio && (
                <div className="pt-2">
                  <p className="text-[12px] font-semibold text-[#7C5362] uppercase tracking-wider mb-1">
                    About
                  </p>
                  <p className="text-xs text-[#2D151D]">{recipient.bio}</p>
                </div>
              )}

              {recipient?.email && (
                <div className="pt-2 flex items-center gap-2.5 text-xs text-[#2D151D]">
                  <Mail className="w-4 h-4 text-[#C24A68]" />
                  <span>{recipient.email}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2.5 text-xs text-[#2D151D]">
                <FileText className="w-4 h-4 text-[#C24A68]" />
                <span>{messages.length} messages in conversation</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Mute Notifications Dialog (Portaled) */}
      {mounted && activeModal === 'mute' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setActiveModal('none');
            onClose();
          }}
        >
          <div
            className="w-full max-w-xs bg-[#FFF5F7] rounded-3xl border border-[#F5BAC6] shadow-2xl p-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 rounded-2xl bg-[#FFEBF0] text-[#C24A68]">
                <BellOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2D151D]">
                  Mute notifications
                </h4>
                <p className="text-[12px] text-[#7C5362]">Other participants will not see this</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-5">
              {[
                { id: '8h', label: '8 Hours' },
                { id: '1w', label: '1 Week' },
                { id: 'always', label: 'Always' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onToggleMute(opt.id as '8h' | '1w' | 'always');
                    setActiveModal('none');
                    onClose();
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5BAC6] hover:border-[#C24A68] hover:bg-[#FFEBF0] text-xs font-semibold text-[#2D151D] text-left transition flex items-center justify-between cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <span className="w-2 h-2 rounded-full bg-[#C24A68] opacity-0 hover:opacity-100" />
                </button>
              ))}

              {isMuted && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleMute('unmute');
                    setActiveModal('none');
                    onClose();
                  }}
                  className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-[#C24A68] hover:bg-[#FFEBF0] transition cursor-pointer"
                >
                  Unmute notifications
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveModal('none');
                onClose();
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] hover:text-[#2D151D] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 3: WhatsApp Disappearing Messages (Internally Portaled) */}
      <DisappearingMessagesModal
        isOpen={activeModal === 'disappearing'}
        onClose={() => {
          setActiveModal('none');
          onClose();
        }}
        disappearingTimer={disappearingTimer}
        onSetDisappearingTimer={onSetDisappearingTimer}
      />

      {/* Modal 4: Clear Chat Confirmation Dialog (Portaled) */}
      {mounted && activeModal === 'clear_confirm' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setActiveModal('none');
            onClose();
          }}
        >
          <div
            className="w-full max-w-sm bg-[#FFF5F7] rounded-3xl border border-[#F5BAC6] shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#C24A68] flex items-center justify-center mx-auto mb-3 shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-center text-[#2D151D] mb-1">
              Clear this chat?
            </h4>
            <p className="text-xs text-[#7C5362] text-center mb-6">
              All messages in this chat will be cleared from your view.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] hover:text-[#2D151D] border border-[#F5BAC6] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  onClearChat();
                  setActiveModal('none');
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#C24A68] hover:bg-[#B83253] text-white shadow-md shadow-[#C24A68]/20 transition cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// -------------------------------------------------------------
// WhatsApp Style Dotted Clock Icon for Disappearing Messages
// -------------------------------------------------------------
export const WhatsAppDottedClockIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" strokeDasharray="2.5 2.5" />
    <polyline points="12 7 12 12 15.5 10" />
  </svg>
);

// -------------------------------------------------------------
// Standalone / Reusable WhatsApp Disappearing Messages Modal
// -------------------------------------------------------------
export interface DisappearingMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  disappearingTimer?: string;
  onSetDisappearingTimer: (timer: 'off' | '24h' | '7d' | '90d') => void;
}

export const DisappearingMessagesModal: React.FC<DisappearingMessagesModalProps> = ({
  isOpen,
  onClose,
  disappearingTimer = 'off',
  onSetDisappearingTimer,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<'off' | '24h' | '7d' | '90d'>(
    (disappearingTimer as 'off' | '24h' | '7d' | '90d') || 'off'
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize internal selection state whenever modal opens or disappearingTimer changes
  useEffect(() => {
    if (isOpen) {
      setSelectedTimer((disappearingTimer as 'off' | '24h' | '7d' | '90d') || 'off');
    }
  }, [isOpen, disappearingTimer]);

  if (!isOpen || !mounted) return null;

  const handleDone = () => {
    if (selectedTimer !== disappearingTimer) {
      onSetDisappearingTimer(selectedTimer);
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#FFF5F7] rounded-3xl border border-[#F5BAC6] shadow-2xl p-6 animate-in zoom-in-95 duration-150 select-none flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <WhatsAppDottedClockIcon className="w-6 h-6" />
        </div>

        <h4 className="text-base font-bold text-center text-[#2D151D] mb-1">
          Disappearing messages
        </h4>
        <p className="text-xs text-[#7C5362] text-center mb-5">
          Make messages in this chat disappear after a set period of time.
        </p>

        <div className="w-full space-y-2.5 mb-6">
          {[
            { id: '24h', label: '24 Hours' },
            { id: '7d', label: '7 Days' },
            { id: '90d', label: '90 Days' },
            { id: 'off', label: 'Off' },
          ].map((opt) => {
            const isSelected = selectedTimer === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedTimer(opt.id as 'off' | '24h' | '7d' | '90d')}
                className={`w-full px-4 py-3 rounded-2xl border text-xs font-medium text-left transition flex items-center justify-between cursor-pointer ${isSelected
                    ? 'border-2 border-[#C24A68] text-[#C24A68] bg-[#FFEBF0] shadow-xs font-bold'
                    : 'border border-[#F5BAC6] text-[#2D151D] bg-[#FFF5F7] hover:bg-[#FFEBF0]/70'
                  }`}
              >
                <span>{opt.label}</span>
                {isSelected ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-[#C24A68] flex items-center justify-center shadow-xs" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-[#F5BAC6]" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleDone}
          className="w-full text-xs sm:text-sm font-semibold bg-[#C24A68] hover:bg-[#B83253] text-white py-2.5 px-6 rounded-xl transition cursor-pointer shadow-md shadow-[#C24A68]/20"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};
