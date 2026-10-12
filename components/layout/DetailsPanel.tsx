'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  User as UserIcon,
  Bell,
  BellOff,
  Search,
  FileText,
  Phone,
  Video,
  Check,
  Calendar,
  Trash2,
  Image as ImageIcon,
  ChevronRight,
  MoreHorizontal,
  Clock,
  Download,
  Eye,
  ExternalLink,
  Play
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWallpaperStore } from '../../store/useWallpaperStore';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { User, Message, Attachment } from '../../types';
import { getMediaUrl } from '../../utils/media';
import { formatLastSeen } from '../../utils/dateUtils';
import { DisappearingMessagesModal } from '../chat/ConversationMenu';

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DetailsPanel: React.FC = () => {
  const {
    isDetailsPanelOpen,
    closeDetailsPanel,
    toggleSearchInChat,
    requestCall,
    mutedConversations,
    setConversationMuted,
  } = useAppStore();

  const {
    activeConversation,
    messages,
    openGroupInfoDrawer,
    getParticipantPresence,
    clearLocalMessages,
    setDisappearingTimer,
  } = useChatStore();

  const { user } = useAuthStore();

  // Local UI states
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const currentDisappearingTimer = activeConversation?.disappearingTimer || 'off';
  const disappearingTimerLabel = useMemo(() => {
    switch (currentDisappearingTimer) {
      case '24h':
        return '24 hours';
      case '7d':
        return '7 days';
      case '90d':
        return '90 days';
      default:
        return 'Off';
    }
  }, [currentDisappearingTimer]);

  const isDirect = activeConversation?.type === 'direct';

  // Find recipient user ID and populated object from direct conversation
  const { recipientId, recipientUser } = useMemo(() => {
    if (!activeConversation || !user || !activeConversation.participants) {
      return { recipientId: null, recipientUser: null };
    }
    const currentUserId = String(user._id);
    const found = activeConversation.participants.find((p) => {
      const pid = typeof p === 'object' && p !== null ? String(p._id) : String(p);
      return pid !== currentUserId;
    });
    if (!found) return { recipientId: null, recipientUser: null };
    if (typeof found === 'object' && found !== null) {
      return { recipientId: String(found._id), recipientUser: found as User };
    }
    return { recipientId: String(found), recipientUser: null };
  }, [activeConversation, user]);

  // Fetch full details of recipient whenever panel opens or active conversation changes
  useEffect(() => {
    if (!recipientId || !isDetailsPanelOpen) {
      setFetchedUser(null);
      return;
    }

    let isMounted = true;
    apiService.getUserById(recipientId)
      .then((res) => {
        if (isMounted && res.success && res.user) {
          setFetchedUser(res.user);
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [recipientId, isDetailsPanelOpen]);

  // Real-time live sync if recipient updates their profile
  useEffect(() => {
    if (!recipientId) return;
    const unsub = socketService.onUserProfileUpdated((data) => {
      if (data?.user && String(data.user._id) === String(recipientId)) {
        setFetchedUser((prev) => ({ ...(prev || {}), ...data.user } as User));
      }
    });
    return () => {
      unsub();
    };
  }, [recipientId]);

  // Combine fresh data with memory data
  const activeUser = fetchedUser || recipientUser;

  // Real-time presence for recipient
  const presence = useMemo(() => {
    if (!activeUser?._id) return { status: 'offline', lastSeen: undefined };
    return getParticipantPresence(activeUser._id, activeUser.status || 'offline');
  }, [activeUser, getParticipantPresence]);

  // Extract shared messages from active conversation
  const activeMessages = useMemo((): Message[] => {
    if (!activeConversation) return [];
    return messages[activeConversation._id] || [];
  }, [activeConversation, messages]);

  // Extract shared image/video media (newest first, unique)
  const sharedImages = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      const msg = activeMessages[i];
      if (!msg.attachments || msg.deletedForEveryone) continue;
      for (let j = msg.attachments.length - 1; j >= 0; j--) {
        const att = msg.attachments[j];
        if (
          att.resourceType === 'image' ||
          att.resourceType === 'video' ||
          att.url?.match(/\.(jpeg|jpg|png|webp|gif|svg|mp4|mov|webm)$/i)
        ) {
          if (!seen.has(att.url)) {
            seen.add(att.url);
            list.push(att.url);
          }
        }
      }
    }
    return list;
  }, [activeMessages]);

  // Extract shared document attachments (newest first, unique)
  const sharedDocuments = useMemo(() => {
    const list: Attachment[] = [];
    const seen = new Set<string>();
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      const msg = activeMessages[i];
      if (!msg.attachments || msg.deletedForEveryone) continue;
      for (let j = msg.attachments.length - 1; j >= 0; j--) {
        const att = msg.attachments[j];
        const isMedia =
          att.resourceType === 'image' ||
          att.resourceType === 'video' ||
          att.url?.match(/\.(jpeg|jpg|png|webp|gif|svg|mp4|mov|webm)$/i);
        if (!isMedia && !seen.has(att.url)) {
          seen.add(att.url);
          list.push(att);
        }
      }
    }
    return list;
  }, [activeMessages]);

  // Extract real URLs shared in message text (newest first, unique)
  const sharedLinks = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const list: { url: string; domain: string }[] = [];
    const seen = new Set<string>();

    for (let i = activeMessages.length - 1; i >= 0; i--) {
      const msg = activeMessages[i];
      if (!msg.content || msg.deletedForEveryone) continue;
      const matches = msg.content.match(urlRegex);
      if (matches) {
        matches.forEach((u) => {
          if (!seen.has(u)) {
            seen.add(u);
            try {
              const parsed = new URL(u);
              list.push({ url: u, domain: parsed.hostname });
            } catch {
              list.push({ url: u, domain: u.slice(0, 25) });
            }
          }
        });
      }
    }

    return list;
  }, [activeMessages]);

  // Mute state
  const isMuted = activeConversation?._id ? Boolean(mutedConversations[activeConversation._id]) : false;
  const currentMuteDuration = activeConversation?._id ? mutedConversations[activeConversation._id] : undefined;

  const handleMuteSelect = (duration: '8h' | '1w' | 'always' | 'unmute') => {
    if (!activeConversation) return;
    setConversationMuted(activeConversation._id, duration);
    setIsMuteModalOpen(false);
  };

  // Clear chat handler
  const handleClearChatHistory = async () => {
    if (!activeConversation) return;
    try {
      await socketService.clearConversation(activeConversation._id);
      clearLocalMessages(activeConversation._id);
    } catch {
      clearLocalMessages(activeConversation._id);
    }
    setIsClearModalOpen(false);
  };

  // Early return if closed or no active conversation
  if (!isDetailsPanelOpen || !activeConversation) return null;

  // Real display metadata
  const displayName = isDirect && activeUser
    ? activeUser.fullName
    : activeConversation.name || 'Group Conversation';

  const avatarUrl = isDirect && activeUser
    ? activeUser.avatar ? getMediaUrl(activeUser.avatar) : undefined
    : activeConversation.avatar ? getMediaUrl(activeConversation.avatar) : undefined;

  const rawBio = isDirect ? activeUser?.bio?.trim() : null;
  const aboutBio = isDirect
    ? (rawBio || null)
    : (activeConversation.description?.trim() || null);

  return (
    <>
      {/* Mobile/Tablet Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        onClick={closeDetailsPanel}
      />
      <aside
        data-chat-details
        className="fixed inset-y-0 right-0 z-50 lg:static lg:z-30 w-full sm:w-[clamp(20rem,80vw,24rem)] lg:w-[clamp(19rem,24vw,22rem)] border-l border-[#F7CAD0] bg-[#FFF5F7] flex flex-col h-full select-none flex-shrink-0 overflow-y-auto shadow-2xl lg:shadow-none transition-all duration-200 animate-in slide-in-from-right"
      >
        {/* Top Header Bar */}
        <div className="h-14 px-4 bg-[#FCEBED] border-b border-[#F7CAD0] flex items-center justify-between flex-shrink-0 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeDetailsPanel}
              title="Close panel"
              className="p-1.5 -ml-1.5 rounded-full text-[#741E34] hover:bg-[#FCD8E0] transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
            <h3 className="text-sm sm:text-base font-bold text-[#2D151D]">
              {isDirect ? 'Contact info' : 'Conversation info'}
            </h3>
          </div>
        </div>

        {/* 1. Cover Photo Banner */}
        <div className="relative w-full h-32 sm:h-36 overflow-hidden flex-shrink-0 bg-cover bg-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sarissa-cover.jpg"
            alt="Cover Banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 2. Hero Profile Card with Overlapping Avatar */}
        <div className="relative flex flex-col items-center px-4 -mt-12 sm:-mt-14 pb-4 border-b border-[#F7CAD0]">
          {/* Overlapping Circular Avatar */}
          <div
            className="relative cursor-pointer group"
            onClick={() => avatarUrl && setPreviewMediaUrl(avatarUrl)}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover ring-4 ring-white shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-[#FAD0D8] text-[#741E34] text-2xl font-bold flex items-center justify-center ring-4 ring-white shadow-md">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Full Name */}
          <h2 className="mt-2.5 text-base sm:text-lg font-bold text-[#2D151D] text-center">
            {displayName}
          </h2>

          {/* Online Presence Status */}
          <div className="flex items-center gap-1.5 text-xs text-[#7C5362] mt-0.5">
            {isDirect ? (
              presence.status === 'online' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-medium text-emerald-700">Online</span>
                </>
              ) : (
                <span>{presence.lastSeen ? formatLastSeen(presence.lastSeen) : 'offline'}</span>
              )
            ) : (
              <span>{`${activeConversation.participants?.length || 0} participants`}</span>
            )}
          </div>

          {/* Real user bio (only rendered if user has a bio) */}
          {aboutBio && (
            <p className="text-xs text-[#7C5362] text-center mt-1 font-medium px-4">
              {aboutBio}
            </p>
          )}

          {/* 3 Circular Action Buttons: Call, Video, Search */}
          <div className="flex items-center justify-center gap-6 sm:gap-7 mt-4 w-full">
            {/* Call */}
            <button
              type="button"
              onClick={() => requestCall('audio')}
              className="flex flex-col items-center group cursor-pointer"
              title="Voice call"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FCD8E0] text-[#741E34] group-hover:bg-[#F8BAC7] flex items-center justify-center transition shadow-2xs">
                <Phone className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <span className="text-[12px] font-medium text-[#7C5362] mt-1">Call</span>
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={() => requestCall('video')}
              className="flex flex-col items-center group cursor-pointer"
              title="Video call"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FCD8E0] text-[#741E34] group-hover:bg-[#F8BAC7] flex items-center justify-center transition shadow-2xs">
                <Video className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <span className="text-[12px] font-medium text-[#7C5362] mt-1">Video</span>
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={toggleSearchInChat}
              className="flex flex-col items-center group cursor-pointer"
              title="Search conversation"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FCD8E0] text-[#741E34] group-hover:bg-[#F8BAC7] flex items-center justify-center transition shadow-2xs">
                <Search className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <span className="text-[12px] font-medium text-[#7C5362] mt-1">Search</span>
            </button>
          </div>
        </div>

        {/* 3. Media, Links & Files Section */}
        <div className="p-4 border-b border-[#F7CAD0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#741E34] text-white flex items-center justify-center text-[11px]">
                📁
              </div>
              <span className="text-xs font-bold text-[#2D151D]">
                Media, Links & Files
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMediaGalleryOpen(true)}
              className="text-xs font-semibold text-[#E05375] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Media Preview Strip */}
          {sharedImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {sharedImages.slice(0, 4).map((url, idx) => {
                const isFourthWithMore = idx === 3 && sharedImages.length > 4;
                const remainingCount = sharedImages.length - 4;
                const isVid = Boolean(url.match(/\.(mp4|mov|webm)$/i));
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isFourthWithMore) {
                        setActiveMediaTab('media');
                        setIsMediaGalleryOpen(true);
                      } else {
                        setPreviewMediaUrl(getMediaUrl(url));
                      }
                    }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[#FCD8E0] border border-[#F7CAD0] shadow-2xs cursor-pointer hover:opacity-95 transition group"
                    title={isFourthWithMore ? `View all ${sharedImages.length} media` : 'View media'}
                  >
                    {isVid ? (
                      <div className="relative w-full h-full bg-black/20 flex items-center justify-center">
                        <video src={getMediaUrl(url)} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(url)}
                        alt={`Shared media ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    {isFourthWithMore && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-xs">
                        +{remainingCount + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : sharedDocuments.length > 0 ? (
            /* If no images, but documents are shared, show recent document preview */
            <div className="mt-3 space-y-1.5">
              {sharedDocuments.slice(0, 2).map((doc, idx) => (
                <a
                  key={idx}
                  href={getMediaUrl(doc.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-[#F7CAD0] hover:bg-white hover:border-[#E05375] transition"
                  title="Download file"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#741E34] shrink-0" />
                    <span className="text-xs text-[#2D151D] font-medium truncate">{doc.originalName || 'Document'}</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#7C5362] shrink-0" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#7C5362] mt-3 py-1">
              No media shared yet
            </p>
          )}
        </div>

        {/* 4. Settings List Items matching mockup */}
        <div className="divide-y divide-[#F7CAD0]/60">

          {/* Mute Notifications with Toggle Switch Slider */}
          <div className="flex items-center justify-between p-3.5 hover:bg-[#FCD8E0]/30 transition">
            <div className="flex items-center gap-3">
              <Bell className="w-4.5 h-4.5 text-[#741E34]" />
              <span className="text-xs font-semibold text-[#2D151D]">Mute Notifications</span>
            </div>
            <button
              type="button"
              onClick={() => handleMuteSelect(isMuted ? 'unmute' : 'always')}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                isMuted ? 'bg-[#E05375]' : 'bg-[#E5D2D6]'
              }`}
              title={isMuted ? 'Muted — click to unmute' : 'Mute chat'}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isMuted ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Disappearing Messages */}
          <div
            onClick={() => setIsDisappearingModalOpen(true)}
            className="flex items-center justify-between p-3.5 hover:bg-[#FCD8E0]/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4.5 h-4.5 text-[#741E34]" />
              <div>
                <p className="text-xs font-semibold text-[#2D151D]">Disappearing Messages</p>
                <p className="text-[12px] text-[#7C5362]">{disappearingTimerLabel}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C5362]" />
          </div>

          {/* Chat Wallpaper */}
          <div
            onClick={() => useWallpaperStore.getState().openWallpaperModal(activeConversation?._id)}
            className="flex items-center justify-between p-3.5 hover:bg-[#FCD8E0]/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4.5 h-4.5 text-[#741E34]" />
              <span className="text-xs font-semibold text-[#2D151D]">Chat Wallpaper</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C5362]" />
          </div>

          {/* If group: Group Options */}
          {!isDirect && (
            <div
              onClick={openGroupInfoDrawer}
              className="flex items-center justify-between p-3.5 hover:bg-[#FCD8E0]/30 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserIcon className="w-4.5 h-4.5 text-[#741E34]" />
                <span className="text-xs font-semibold text-[#2D151D]">Manage Members</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#7C5362]" />
            </div>
          )}
        </div>

        {/* Danger Zone: Clear Chat */}
        <div className="p-4 mt-auto">
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl hover:bg-rose-100/60 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear chat history</span>
          </button>
        </div>
      </aside>

      {/* Expanded Media, Links & Files Modal */}
      {isMediaGalleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMediaGalleryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-[#F5BAC6] pb-3">
              <h4 className="text-sm font-bold text-[#2D151D]">
                Media, Links & Docs
              </h4>
              <button
                type="button"
                onClick={() => setIsMediaGalleryOpen(false)}
                className="p-1 rounded-lg text-[#7C5362] hover:text-[#C24A68]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FCE7EC] text-xs">
              <button
                type="button"
                onClick={() => setActiveMediaTab('media')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  activeMediaTab === 'media'
                    ? 'bg-white text-[#C24A68] shadow-xs'
                    : 'text-[#7C5362] hover:text-[#2D151D]'
                }`}
              >
                Media ({sharedImages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('docs')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  activeMediaTab === 'docs'
                    ? 'bg-white text-[#C24A68] shadow-xs'
                    : 'text-[#7C5362] hover:text-[#2D151D]'
                }`}
              >
                Docs ({sharedDocuments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaTab('links')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  activeMediaTab === 'links'
                    ? 'bg-white text-[#C24A68] shadow-xs'
                    : 'text-[#7C5362] hover:text-[#2D151D]'
                }`}
              >
                Links ({sharedLinks.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeMediaTab === 'media' && (
                sharedImages.length === 0 ? (
                  <p className="text-center text-xs text-[#7C5362] py-8">No photos or videos shared yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {sharedImages.map((url, i) => {
                      const isVid = Boolean(url.match(/\.(mp4|mov|webm)$/i));
                      return (
                        <div
                          key={i}
                          onClick={() => setPreviewMediaUrl(getMediaUrl(url))}
                          className="aspect-square rounded-xl overflow-hidden bg-[#FCE7EC] cursor-pointer group relative shadow-2xs border border-[#F5BAC6]"
                        >
                          {isVid ? (
                            <div className="relative w-full h-full bg-black/20 flex items-center justify-center">
                              <video src={getMediaUrl(url)} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="w-5 h-5 text-white fill-white" />
                              </div>
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMediaUrl(url)}
                              alt={`Media ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {activeMediaTab === 'docs' && (
                sharedDocuments.length === 0 ? (
                  <p className="text-center text-xs text-[#7C5362] py-8">No documents shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sharedDocuments.map((doc, idx) => (
                      <a
                        key={idx}
                        href={getMediaUrl(doc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#F5BAC6] hover:border-[#C24A68] transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-[#C24A68] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2D151D] truncate">{doc.originalName || 'Document'}</p>
                            <p className="text-[11px] text-[#7C5362]">{formatFileSize(doc.size)}</p>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-[#7C5362]" />
                      </a>
                    ))}
                  </div>
                )
              )}

              {activeMediaTab === 'links' && (
                sharedLinks.length === 0 ? (
                  <p className="text-center text-xs text-[#7C5362] py-8">No links shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sharedLinks.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#F5BAC6] hover:border-[#C24A68] transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#2D151D] truncate">{item.domain}</p>
                          <p className="text-[11px] text-[#7C5362] truncate">{item.url}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#C24A68] shrink-0" />
                      </a>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mute Modal Dialog */}
      {isMuteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMuteModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center shadow-2xs">
                  <BellOff className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D151D]">
                    Mute notifications
                  </h4>
                  <p className="text-[12px] text-[#7C5362]">
                    Other participants will not see that you muted this chat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMuteModalOpen(false)}
                className="p-1 rounded-lg text-[#7C5362] hover:text-[#C24A68]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleMuteSelect('8h')}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  currentMuteDuration === '8h'
                    ? 'border-[#C24A68] bg-[#FCE7EC] text-[#9F2241]'
                    : 'border-[#F5BAC6] bg-white text-[#2D151D] hover:bg-[#FFEBF0]'
                }`}
              >
                <span>8 hours</span>
                {currentMuteDuration === '8h' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleMuteSelect('1w')}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  currentMuteDuration === '1w'
                    ? 'border-[#C24A68] bg-[#FCE7EC] text-[#9F2241]'
                    : 'border-[#F5BAC6] bg-white text-[#2D151D] hover:bg-[#FFEBF0]'
                }`}
              >
                <span>1 week</span>
                {currentMuteDuration === '1w' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleMuteSelect('always')}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  currentMuteDuration === 'always'
                    ? 'border-[#C24A68] bg-[#FCE7EC] text-[#9F2241]'
                    : 'border-[#F5BAC6] bg-white text-[#2D151D] hover:bg-[#FFEBF0]'
                }`}
              >
                <span>Always</span>
                {currentMuteDuration === 'always' && <Check className="w-4 h-4" />}
              </button>

              {isMuted && (
                <button
                  type="button"
                  onClick={() => handleMuteSelect('unmute')}
                  className="w-full p-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between"
                >
                  <span>Unmute notifications</span>
                  <Bell className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {isClearModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsClearModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-[#2D151D]">
                Clear this conversation?
              </h4>
              <p className="text-xs text-[#7C5362] mt-1.5 leading-relaxed">
                All messages in this chat will be cleared from your view. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#F5BAC6] text-xs font-semibold text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatHistory}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Clear chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Media Full Preview Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {previewMediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
              <video src={previewMediaUrl} controls autoPlay className="w-full h-full object-contain max-h-[80vh]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewMediaUrl}
                alt="Media preview"
                className="w-full h-full object-contain max-h-[80vh]"
              />
            )}
          </div>
        </div>
      )}
      {/* Disappearing Messages Modal */}
      <DisappearingMessagesModal
        isOpen={isDisappearingModalOpen}
        onClose={() => setIsDisappearingModalOpen(false)}
        disappearingTimer={currentDisappearingTimer}
        onSetDisappearingTimer={(timer) => {
          if (activeConversation?._id) {
            setDisappearingTimer(activeConversation._id, timer);
          }
        }}
      />
    </>
  );
};
