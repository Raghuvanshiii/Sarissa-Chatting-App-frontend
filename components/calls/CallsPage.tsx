'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  Video, 
  Search, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PhoneMissed, 
  PhoneCall, 
  Users, 
  Loader2 
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useAppStore, CallHistoryEntry } from '../../store/useAppStore';
import { apiService } from '../../services/api';
import { User } from '../../types';
import { getMediaUrl } from '../../utils/media';
import { MobileNavigation } from '../layout/MobileNavigation';

type CallFilterTab = 'all' | 'recent' | 'missed';

export const CallsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    conversations, 
    setActiveConversation, 
    startDirectChat,
    getParticipantPresence 
  } = useChatStore();
  const { 
    callHistory, 
    requestCall, 
    clearCallHistory 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<CallFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contacts, setContacts] = useState<User[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(true);
  const [serverCalls, setServerCalls] = useState<CallHistoryEntry[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState<boolean>(false);
  const [callingTargetId, setCallingTargetId] = useState<string | null>(null);

  // 1. Fetch system contacts for the "All" contacts tab
  useEffect(() => {
    let isMounted = true;
    const fetchContacts = async () => {
      try {
        setIsLoadingContacts(true);
        const res = await apiService.searchUsers('');
        if (isMounted) {
          const list = (res.users || []).filter((u) => u._id !== user?._id);
          setContacts(list);
        }
      } catch (err) {
        console.error('Failed to load contacts for calls:', err);
      } finally {
        if (isMounted) {
          setIsLoadingContacts(false);
        }
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // 2. Fetch call history from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchCalls = async () => {
      try {
        setIsLoadingCalls(true);
        const res = await apiService.getCallHistory();
        if (isMounted && res.calls) {
          setServerCalls(res.calls);
        }
      } catch (err) {
        console.error('Failed to load call history:', err);
      } finally {
        if (isMounted) {
          setIsLoadingCalls(false);
        }
      }
    };

    fetchCalls();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // 3. Aggregate all calls from local call history, server calls, and conversation messages
  const aggregatedCalls = useMemo<CallHistoryEntry[]>(() => {
    const list: CallHistoryEntry[] = [...callHistory];
    const seenIds = new Set<string>(callHistory.map((c) => c.id));

    // Merge server-persisted calls
    serverCalls.forEach((sc) => {
      if (!seenIds.has(sc.id)) {
        list.push(sc);
        seenIds.add(sc.id);
      }
    });

    // Extract calls from conversation messages currently in memory
    const storeMessages = useChatStore.getState().messages || {};

    conversations.forEach((conv) => {
      const isDirect = conv.type === 'direct';
      const otherParticipant = isDirect
        ? (conv.participants?.find((p) => (typeof p === 'object' ? p._id : p) !== user?._id) as User | undefined)
        : null;

      const participantName = isDirect
        ? (otherParticipant?.fullName || otherParticipant?.username || 'Contact')
        : (conv.name || 'Group Call');

      const participantAvatar = isDirect ? otherParticipant?.avatar : conv.avatar;
      const participantId = isDirect ? (otherParticipant?._id || '') : conv._id;

      const candidates: any[] = [];
      if (conv.lastMessage && conv.lastMessage.content) {
        candidates.push(conv.lastMessage);
      }
      const loadedMsgs = storeMessages[conv._id] || [];
      loadedMsgs.forEach((m) => {
        if (m && m.content) candidates.push(m);
      });

      candidates.forEach((msg) => {
        const text = msg.content || '';
        const isCallMessage =
          text.includes('📞') ||
          text.includes('🎥') ||
          text.toLowerCase().includes('voice call') ||
          text.toLowerCase().includes('video call');

        if (isCallMessage && msg._id && !seenIds.has(msg._id)) {
          const isVideo = text.includes('🎥') || text.toLowerCase().includes('video');
          const isMissed = text.toLowerCase().includes('missed');
          const isOwn = typeof msg.senderId === 'object'
            ? msg.senderId?._id === user?._id
            : msg.senderId === user?._id;

          const durationMatch = text.match(/•\s*(.*)$/);
          const durationText = durationMatch ? durationMatch[1].trim() : (isMissed ? 'Missed' : '');

          list.push({
            id: msg._id,
            conversationId: conv._id,
            participantId,
            participantName,
            participantAvatar,
            callType: isVideo ? 'video' : 'audio',
            direction: isMissed ? (isOwn ? 'outgoing' : 'missed') : (isOwn ? 'outgoing' : 'incoming'),
            isMissed,
            isOwn,
            timestamp: msg.createdAt || new Date(),
            durationText,
            isGroup: !isDirect,
          });
          seenIds.add(msg._id);
        }
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [callHistory, serverCalls, conversations, user?._id]);

  // Subset of missed calls: includes all missed incoming and outgoing calls
  const missedCalls = useMemo(() => {
    return aggregatedCalls.filter((c) => {
      const isMissedDir = c.direction === 'missed';
      const isMissedFlag = Boolean(c.isMissed);
      const isMissedDuration = Boolean(c.durationText && c.durationText.toLowerCase().includes('missed'));
      return isMissedDir || isMissedFlag || isMissedDuration;
    });
  }, [aggregatedCalls]);

  // 3. Search filters for each category
  const filteredRecentCalls = useMemo(() => {
    if (!searchQuery.trim()) return aggregatedCalls;
    const q = searchQuery.toLowerCase().trim();
    return aggregatedCalls.filter(
      (c) =>
        c.participantName.toLowerCase().includes(q) ||
        (c.durationText && c.durationText.toLowerCase().includes(q))
    );
  }, [aggregatedCalls, searchQuery]);

  const filteredMissedCalls = useMemo(() => {
    if (!searchQuery.trim()) return missedCalls;
    const q = searchQuery.toLowerCase().trim();
    return missedCalls.filter(
      (c) =>
        c.participantName.toLowerCase().includes(q) ||
        (c.durationText && c.durationText.toLowerCase().includes(q))
    );
  }, [missedCalls, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.bio && c.bio.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  // Dynamic search placeholder
  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'all') return 'Search contacts...';
    if (activeTab === 'recent') return 'Search recent calls...';
    return 'Search missed calls...';
  }, [activeTab]);

  // 4. Handle initiating an Audio or Video call
  const handleStartCall = async (
    participantId: string,
    convId?: string,
    type: 'audio' | 'video' = 'audio'
  ) => {
    setCallingTargetId(participantId);
    try {
      if (convId) {
        const conv = conversations.find((c) => c._id === convId);
        if (conv) {
          setActiveConversation(conv);
          requestCall(type);
          return;
        }
      }

      // Start or retrieve direct conversation with this user
      const conv = await startDirectChat(participantId);
      if (conv) {
        setActiveConversation(conv);
      }
      requestCall(type);
    } catch (err) {
      console.error('Failed to start call:', err);
    } finally {
      setCallingTargetId(null);
    }
  };

  // Format call timestamp into friendly readable string
  const formatCallDate = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  // Render a call card for Recent & Missed views
  const renderCallItem = (call: CallHistoryEntry) => {
    const isMissed =
      call.direction === 'missed' ||
      Boolean(call.isMissed) ||
      Boolean(call.durationText && call.durationText.toLowerCase().includes('missed'));

    const isOutgoing = call.direction === 'outgoing' || Boolean(call.isOwn);
    const isVideo = call.callType === 'video';

    return (
      <div
        key={call.id}
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#FCEAEF] transition duration-150 group cursor-pointer"
        onClick={() => handleStartCall(call.participantId, call.conversationId, call.callType)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {call.participantAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getMediaUrl(call.participantAvatar)}
              alt={call.participantName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-2xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FCE7EC] text-[#C24A68] text-base font-bold flex items-center justify-center font-cute ring-2 ring-white shadow-2xs">
              {call.participantName.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Call Type Indicator icon on avatar */}
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#741E34]">
            {isVideo ? (
              <Video className="w-3 h-3 text-[#C24A68]" />
            ) : (
              <Phone className="w-3 h-3 text-[#C24A68]" />
            )}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-cute text-[15.5px] font-bold truncate leading-tight ${
            isMissed ? 'text-rose-600' : 'text-[#2D151D]'
          }`}>
            {call.participantName}
          </h3>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-cute text-[#7C5362]">
            {/* Direction Arrow */}
            {isMissed ? (
              isOutgoing ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.2]" />
              ) : (
                <PhoneMissed className="w-3.5 h-3.5 text-rose-500 shrink-0 stroke-[2.2]" />
              )
            ) : isOutgoing ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-[#7C5362] shrink-0 stroke-[2.2]" />
            ) : (
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.2]" />
            )}

            <span className="truncate">
              {isMissed
                ? (isOutgoing ? 'Missed outgoing • ' : 'Missed incoming • ')
                : (call.durationText ? `${call.durationText} • ` : '')}
              {formatCallDate(call.timestamp)}
            </span>
          </div>
        </div>

        {/* Action Buttons: Audio Call & Video Call */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartCall(call.participantId, call.conversationId, 'audio');
            }}
            className="p-2 rounded-full text-[#7D2338] hover:bg-[#FCD8E0] hover:text-[#C24A68] active:scale-95 transition cursor-pointer"
            title="Voice Call"
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartCall(call.participantId, call.conversationId, 'video');
            }}
            className="p-2 rounded-full text-[#7D2338] hover:bg-[#FCD8E0] hover:text-[#C24A68] active:scale-95 transition cursor-pointer"
            title="Video Call"
          >
            <Video className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full h-full bg-[#FFF0F3] border-r border-[#F7CAD0] flex flex-col z-10 flex-shrink-0 select-none overflow-hidden font-cute">
      
      {/* 1. Header Bar ("Calls" Title) */}
      <header className="px-4.5 pt-4.5 pb-2 flex items-center justify-between flex-shrink-0">
        <h1 className="font-cute text-2xl lg:text-[27px] font-bold text-[#2D151D] tracking-tight">
          Calls
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
            placeholder={searchPlaceholder}
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

      {/* 3. Filter Tabs Bar: All (Contacts), Recent (Call History), Missed */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-cute text-xs flex-shrink-0">
        {/* All Tab -> Displays all contacts */}
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
          }`}
        >
          <span>All</span>
          {contacts.length > 0 && (
            <span className="ml-1 opacity-80">{contacts.length}</span>
          )}
        </button>

        {/* Recent Tab -> Displays call history / recent calls */}
        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap ${
            activeTab === 'recent'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
          }`}
        >
          <span>Recent</span>
          {aggregatedCalls.length > 0 && (
            <span className="ml-1 opacity-80">{aggregatedCalls.length}</span>
          )}
        </button>

        {/* Missed Tab -> Displays missed calls */}
        <button
          type="button"
          onClick={() => setActiveTab('missed')}
          className={`px-3 py-1.5 rounded-full transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            activeTab === 'missed'
              ? 'bg-[#E05375] text-white font-bold shadow-2xs'
              : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
          }`}
        >
          <span>Missed</span>
          {missedCalls.length > 0 && (
            <span className="ml-0.5 opacity-80">{missedCalls.length}</span>
          )}
        </button>
      </div>

      {/* 4. Filter-Specific Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">

        {/* --- ALL TAB: Displays all contacts (no recent calls) --- */}
        {activeTab === 'all' && (
          <div>
            <div className="px-2.5 pt-1 pb-1.5 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
              <span>Contacts ({filteredContacts.length})</span>
            </div>

            {isLoadingContacts ? (
              <div className="p-8 flex items-center justify-center text-[#9A707E] gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#E05375]" />
                <span>Loading contacts...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-[#7C5362] font-cute text-xs flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mb-2 shadow-2xs">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <p className="font-bold text-sm text-[#2D151D]">
                  {searchQuery ? 'No contacts match search' : 'No contacts available'}
                </p>
                <p className="text-xs text-[#9A707E] mt-0.5 max-w-[210px]">
                  {searchQuery 
                    ? 'Try searching with a different name' 
                    : 'Your contacts will appear here to start audio or video calls'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => {
                  const presence = getParticipantPresence(contact._id, contact.status || 'offline');
                  const isOnline = presence.status === 'online';

                  return (
                    <div
                      key={contact._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#FCEAEF] transition duration-150 group cursor-pointer"
                      onClick={() => handleStartCall(contact._id, undefined, 'audio')}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {contact.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(contact.avatar)}
                            alt={contact.fullName || contact.username}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-2xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#FCE7EC] text-[#C24A68] text-sm font-bold flex items-center justify-center font-cute ring-2 ring-white shadow-2xs">
                            {(contact.fullName || contact.username).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight">
                          {contact.fullName || contact.username}
                        </h4>
                        <p className="text-xs font-cute text-[#7C5362] truncate mt-0.5">
                          {isOnline ? 'Online now' : contact.bio || 'Available'}
                        </p>
                      </div>

                      {/* Action Buttons: Audio Call & Video Call */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCall(contact._id, undefined, 'audio');
                          }}
                          disabled={callingTargetId === contact._id}
                          className="p-2 rounded-full text-[#7D2338] hover:bg-[#FCD8E0] hover:text-[#C24A68] active:scale-95 transition cursor-pointer"
                          title="Start Voice Call"
                        >
                          <Phone className="w-4 h-4 stroke-[2.2]" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCall(contact._id, undefined, 'video');
                          }}
                          disabled={callingTargetId === contact._id}
                          className="p-2 rounded-full text-[#7D2338] hover:bg-[#FCD8E0] hover:text-[#C24A68] active:scale-95 transition cursor-pointer"
                          title="Start Video Call"
                        >
                          <Video className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- RECENT TAB: Displays call history / recent calls only --- */}
        {activeTab === 'recent' && (
          <div>
            <div className="px-2.5 pt-1 pb-1.5 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
              <span>Recent Calls ({filteredRecentCalls.length})</span>
              {filteredRecentCalls.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearCallHistory();
                    setServerCalls([]);
                  }}
                  className="text-[11px] text-[#C24A68] hover:underline cursor-pointer lowercase"
                >
                  clear
                </button>
              )}
            </div>

            {isLoadingCalls && aggregatedCalls.length === 0 ? (
              <div className="p-8 flex items-center justify-center text-[#9A707E] gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#E05375]" />
                <span>Loading recent calls...</span>
              </div>
            ) : filteredRecentCalls.length === 0 ? (
              <div className="p-8 text-center text-[#7C5362] font-cute text-xs flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mb-2 shadow-2xs">
                  <PhoneCall className="w-5 h-5 stroke-[2.2]" />
                </div>
                <p className="font-bold text-sm text-[#2D151D]">No recent calls</p>
                <p className="text-xs text-[#9A707E] mt-0.5 max-w-[210px]">
                  {searchQuery 
                    ? 'No calls match your search' 
                    : 'Calls you make or receive will appear here. Switch to All to start a call.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRecentCalls.map(renderCallItem)}
              </div>
            )}
          </div>
        )}

        {/* --- MISSED TAB: Displays missed calls only --- */}
        {activeTab === 'missed' && (
          <div>
            <div className="px-2.5 pt-1 pb-1.5 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
              <span>Missed Calls ({filteredMissedCalls.length})</span>
            </div>

            {isLoadingCalls && aggregatedCalls.length === 0 ? (
              <div className="p-8 flex items-center justify-center text-[#9A707E] gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#E05375]" />
                <span>Loading missed calls...</span>
              </div>
            ) : filteredMissedCalls.length === 0 ? (
              <div className="p-8 text-center text-[#7C5362] font-cute text-xs flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mb-2 shadow-2xs">
                  <PhoneMissed className="w-5 h-5 stroke-[2.2]" />
                </div>
                <p className="font-bold text-sm text-[#2D151D]">No missed calls</p>
                <p className="text-xs text-[#9A707E] mt-0.5 max-w-[210px]">
                  {searchQuery 
                    ? 'No missed calls match your search' 
                    : 'You have answered all incoming calls!'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMissedCalls.map(renderCallItem)}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile-Only Bottom Navigation Bar */}
      <MobileNavigation />
    </aside>
  );
};
