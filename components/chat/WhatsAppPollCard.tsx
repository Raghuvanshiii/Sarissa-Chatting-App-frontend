'use client';

import React, { useState, useMemo } from 'react';
import { Check, CheckCircle2, Circle, Users, BarChart2, ChevronRight } from 'lucide-react';
import { PollData, PollOption } from './PollModal';
import { PollVotesModal } from './PollVotesModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { User } from '../../types';

interface WhatsAppPollCardProps {
  poll: PollData;
  isOwn: boolean;
  onVote: (optionId: string) => void;
}

export const WhatsAppPollCard: React.FC<WhatsAppPollCardProps> = ({
  poll,
  isOwn,
  onVote,
}) => {
  const { user: currentUser } = useAuthStore();
  const { activeConversation, conversations } = useChatStore();

  const [isVotesModalOpen, setIsVotesModalOpen] = useState(false);
  const [selectedOptionForVotes, setSelectedOptionForVotes] = useState<string | null>(null);

  const currentUserId = currentUser?._id || '';

  // Calculate total votes across all options
  const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

  // Map known users for quick avatar/name previews
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

  const resolveVoter = (voteItem: string | unknown) => {
    let uid = '';
    let embeddedName = '';
    let embeddedAvatar = '';

    if (typeof voteItem === 'string') {
      uid = voteItem;
    } else if (typeof voteItem === 'object' && voteItem !== null) {
      const v = voteItem as Record<string, string>;
      uid = v.userId || v._id || '';
      embeddedName = v.name || v.username || '';
      embeddedAvatar = v.avatar || '';
    }

    const isCurrent = Boolean(currentUser && currentUser._id === uid);
    const matchedUser = userMap.get(uid);

    return {
      userId: uid,
      name: isCurrent
        ? 'You'
        : matchedUser?.fullName || embeddedName || matchedUser?.username || 'Member',
      avatar: isCurrent ? currentUser?.avatar : matchedUser?.avatar || embeddedAvatar,
      isCurrentUser: isCurrent,
    };
  };

  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl border p-4.5 my-1.5 min-w-[300px] max-w-sm shadow-xs transition select-none text-[#2D151D] ${
          isOwn
            ? 'bg-black/[0.04] border-black/10'
            : 'bg-white/95 border-[#F5BAC6]'
        }`}
      >
        {/* Poll Header */}
        <div className="mb-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A4A00] uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4 rotate-90 stroke-[2.5]" />
            <span>Poll</span>
          </div>
          <h3 className="text-[16.5px] sm:text-base font-bold leading-snug text-[#2D151D]">{poll.question}</h3>
          <p className="text-xs text-[#5C404C] mt-0.5">
            {poll.allowMultiple ? 'Select one or more' : 'Select one'}
          </p>
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {poll.options.map((opt) => {
            const voteCount = opt.votes?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const hasVoted = Boolean(
              currentUserId &&
                opt.votes?.some((v: unknown) => {
                  const id = typeof v === 'object' && v !== null ? (v as { userId?: string }).userId : v;
                  return id === currentUserId;
                })
            );

            const voters = (opt.votes || []).map(resolveVoter);
            const voterNamesString = voters.map((v) => v.name).join(', ');

            return (
              <div
                key={opt.id}
                onClick={() => onVote(opt.id)}
                className={`relative overflow-hidden rounded-xl border p-3 cursor-pointer transition active:scale-[0.99] select-none text-[#2D151D] ${
                  hasVoted
                    ? isOwn
                      ? 'border-[#C24A68] bg-[#C24A68]/15 text-[#2D151D]'
                      : 'border-[#C24A68] bg-[#FFEBF0] text-[#C24A68]'
                    : isOwn
                    ? 'border-black/15 hover:border-black/30 bg-black/[0.04] text-[#2D151D]'
                    : 'border-[#F5BAC6] hover:border-[#E07A93] bg-[#FFF5F7]/80 text-[#2D151D]'
                }`}
              >
                {/* Progress bar background */}
                {totalVotes > 0 && (
                  <div
                    className="absolute top-0 bottom-0 left-0 transition-all duration-300 opacity-20 pointer-events-none bg-[#C24A68]"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                {/* Option content */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Radio / Checkbox circle */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                        hasVoted
                          ? 'bg-[#C24A68] text-white shadow-xs'
                          : isOwn
                          ? 'border-2 border-black/40 bg-white/80'
                          : 'border-2 border-[#F5BAC6] bg-white'
                      }`}
                    >
                      {hasVoted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <span className="text-[14.5px] sm:text-sm font-semibold truncate leading-tight text-[#2D151D]">
                      {opt.text}
                    </span>
                  </div>

                  {/* Interactive Vote stats button - Click to view voters for this option */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (voteCount > 0) {
                        setSelectedOptionForVotes(opt.id);
                        setIsVotesModalOpen(true);
                      }
                    }}
                    title={
                      voteCount > 0
                        ? `Click to view voters: ${voterNamesString}`
                        : 'No votes yet'
                    }
                    className={`flex items-center gap-1.5 flex-shrink-0 text-right py-1 px-1.5 rounded-lg transition group/btn ${
                      voteCount > 0
                        ? isOwn
                          ? 'hover:bg-black/10 active:scale-95 cursor-pointer ring-1 ring-black/10'
                          : 'hover:bg-[#FFEBF0] active:scale-95 cursor-pointer ring-1 ring-[#F5BAC6]'
                        : 'cursor-default'
                    }`}
                  >
                    {/* Mini overlapping voter avatars */}
                    {voters.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden mr-0.5">
                        {voters.slice(0, 3).map((voter, vIdx) => (
                          <div
                            key={voter.userId || vIdx}
                            className={`w-4 h-4 rounded-full ring-1 ring-white flex items-center justify-center text-[8.5px] font-medium text-white uppercase flex-shrink-0 shadow-2xs ${
                              voter.isCurrentUser
                                ? 'bg-[#C24A68]'
                                : 'bg-[#E07A93]'
                            }`}
                            title={voter.name}
                          >
                            {voter.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={voter.avatar}
                                alt={voter.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              voter.name.slice(0, 1)
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-[12px] font-mono font-bold text-[#2D151D]">
                      {percentage}%
                    </span>
                    <span
                      className={`text-[11px] font-semibold text-[#2D151D] ${
                        voteCount > 0
                          ? isOwn
                            ? 'group-hover/btn:underline'
                            : 'group-hover/btn:underline text-[#C24A68]'
                          : 'opacity-70'
                      }`}
                    >
                      ({voteCount})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Total votes with clickable button to view all voters */}
        <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between text-[12px] text-[#5C404C]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (totalVotes > 0) {
                setSelectedOptionForVotes(null);
                setIsVotesModalOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 transition rounded-md py-0.5 px-1 -ml-1 ${
              totalVotes > 0
                ? isOwn
                  ? 'hover:bg-black/10 hover:text-black hover:underline cursor-pointer font-bold text-[#2D151D]'
                  : 'hover:bg-[#FFEBF0] hover:text-[#C24A68] hover:underline cursor-pointer font-bold'
                : 'cursor-default text-[#5C404C]'
            }`}
            title={totalVotes > 0 ? 'Click to view all voters' : 'No votes yet'}
          >
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </span>
          </button>
        </div>
      </div>

      {/* Poll Votes Breakdown Modal */}
      <PollVotesModal
        isOpen={isVotesModalOpen}
        onClose={() => setIsVotesModalOpen(false)}
        poll={poll}
        initialOptionId={selectedOptionForVotes}
      />
    </>
  );
};
