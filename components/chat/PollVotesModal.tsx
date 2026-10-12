'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  BarChart2, 
  Users, 
  Check, 
  CheckCircle2,
  Calendar,
  Vote
} from 'lucide-react';
import { PollData, PollOption } from './PollModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { User } from '../../types';

interface PollVotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: PollData;
  initialOptionId?: string | null;
}

interface ResolvedVoter {
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  isCurrentUser: boolean;
  votedAt?: string;
}

export const PollVotesModal: React.FC<PollVotesModalProps> = ({
  isOpen,
  onClose,
  poll,
  initialOptionId = null,
}) => {
  const { user: currentUser } = useAuthStore();
  const { activeConversation, conversations } = useChatStore();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialOptionId);

  // Build a fast lookup map of all known users across activeConversation and all conversations
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    if (currentUser) {
      map.set(currentUser._id, currentUser);
    }
    activeConversation?.participants?.forEach((p) => {
      map.set(p._id, p);
    });
    conversations?.forEach((c) => {
      c.participants?.forEach((p) => {
        if (!map.has(p._id)) {
          map.set(p._id, p);
        }
      });
    });
    return map;
  }, [currentUser, activeConversation, conversations]);

  // Helper to extract userId and resolve voter profile
  const resolveVoter = (voteItem: string | unknown): ResolvedVoter => {
    let uid = '';
    let embeddedName = '';
    let embeddedUsername = '';
    let embeddedAvatar = '';
    let votedAt: string | undefined = undefined;

    if (typeof voteItem === 'string') {
      uid = voteItem;
    } else if (typeof voteItem === 'object' && voteItem !== null) {
      const v = voteItem as Record<string, string>;
      uid = v.userId || v._id || '';
      embeddedName = v.name || '';
      embeddedUsername = v.username || '';
      embeddedAvatar = v.avatar || '';
      votedAt = v.votedAt;
    }

    const isCurrent = Boolean(currentUser && currentUser._id === uid);
    const matchedUser = userMap.get(uid);

    const name = isCurrent
      ? 'You'
      : matchedUser?.fullName || embeddedName || matchedUser?.username || embeddedUsername || 'Member';

    const username = isCurrent
      ? currentUser?.username || ''
      : matchedUser?.username || embeddedUsername || (uid ? uid.slice(-4) : '');

    const avatar = isCurrent
      ? currentUser?.avatar
      : matchedUser?.avatar || embeddedAvatar;

    return {
      userId: uid,
      name,
      username,
      avatar,
      isCurrentUser: isCurrent,
      votedAt,
    };
  };

  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

  const displayedOptions = useMemo(() => {
    if (!selectedOptionId) return poll.options;
    return poll.options.filter((opt) => opt.id === selectedOptionId);
  }, [poll.options, selectedOptionId]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-[#2D151D]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <BarChart2 className="w-5 h-5 rotate-90" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#2D151D] flex items-center gap-2">
                <span>Poll Votes</span>
                <span className="text-xs font-bold text-[#9F2241] bg-[#FCE7EC] border border-[#F5BAC6] px-2 py-0.5 rounded-full">
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
              </h2>
              <p className="text-xs text-[#7C5362] truncate max-w-sm">
                {poll.question}
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

        {/* Options Filter Tabs */}
        <div className="px-4 py-2 border-b border-[#F5BAC6] bg-[#FFF0F3] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedOptionId(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedOptionId === null
                ? 'bg-[#C24A68] text-white shadow-2xs'
                : 'bg-white/80 border border-[#F5BAC6] text-[#7C5362] hover:bg-[#FCE7EC]'
            }`}
          >
            All Options ({totalVotes})
          </button>
          {poll.options.map((opt) => {
            const count = opt.votes?.length || 0;
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOptionId(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#C24A68] text-white shadow-2xs'
                    : 'bg-white/80 border border-[#F5BAC6] text-[#7C5362] hover:bg-[#FCE7EC]'
                }`}
              >
                <span className="truncate max-w-[120px]">{opt.text}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#FCE7EC] text-[#9F2241]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: List of Options and Their Voters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayedOptions.map((opt) => {
            const voteCount = opt.votes?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const voters = (opt.votes || []).map(resolveVoter);

            return (
              <div
                key={opt.id}
                className="rounded-2xl border border-[#F5BAC6] bg-white/90 overflow-hidden shadow-2xs"
              >
                {/* Option Header */}
                <div className="px-4 py-3 bg-[#FFEBF0]/60 border-b border-[#F5BAC6] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-full bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-[#2D151D] truncate">
                      {opt.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-[#2D151D]">
                      {percentage}%
                    </span>
                    <span className="text-[12px] font-bold text-[#9F2241] bg-[#FCE7EC] border border-[#F5BAC6] px-2 py-0.5 rounded-full">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                </div>

                {/* Voters List */}
                <div className="p-2 space-y-1">
                  {voters.length === 0 ? (
                    <div className="py-3 px-3 text-center text-xs text-[#7C5362] italic">
                      No one has voted for this option yet
                    </div>
                  ) : (
                    voters.map((voter, vIdx) => (
                      <div
                        key={voter.userId || vIdx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FCE7EC]/50 transition select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Voter Avatar */}
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-2xs flex-shrink-0 bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68]">
                            {voter.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={voter.avatar}
                                alt={voter.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              voter.name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          {/* Voter Name & Username */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[#2D151D] truncate">
                                {voter.name}
                              </p>
                              {voter.isCurrentUser && (
                                <span className="text-[11px] font-bold bg-[#FCE7EC] text-[#9F2241] px-1.5 py-0.2 rounded-full border border-[#F5BAC6]">
                                  You
                                </span>
                              )}
                            </div>
                            {voter.username && (
                              <p className="text-[12px] text-[#7C5362] truncate">
                                @{voter.username}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Voted Confirmation Badge */}
                        <div className="flex items-center gap-1 text-[12px] font-bold text-[#9F2241] bg-[#FCE7EC] border border-[#F5BAC6] px-2 py-0.5 rounded-full flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Voted</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <span className="text-xs text-[#7C5362] flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-[#C24A68]" />
            <span>
              {poll.allowMultiple ? 'Multiple votes allowed' : 'Single vote only'}
            </span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-[#F5BAC6] text-[#7C5362] hover:text-[#2D151D] hover:bg-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
