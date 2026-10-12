'use client';

import React from 'react';
import { Message, User } from '../../types';
import { MessageBubble } from './MessageBubble';
import { HoneycombBackground } from './HoneycombBackground';
import { FreshConversationGreeting } from './FreshConversationGreeting';
import { isDifferentCalendarDay, formatMessageDateDivider } from '../../utils/dateUtils';
import { WhatsAppDottedClockIcon } from './ConversationMenu';
import { useWallpaperStore } from '../../store/useWallpaperStore';
import { WallpaperOption } from '../../constants/wallpapers';

function getWallpaperStyle(wp: WallpaperOption): React.CSSProperties {
  if (wp.type === 'image' || wp.type === 'pattern') {
    return {
      backgroundImage: `url(${wp.url})`,
      backgroundRepeat: wp.repeat ? 'repeat' : 'no-repeat',
      backgroundSize: wp.size || 'cover',
      backgroundPosition: 'center',
    };
  }
  if (wp.type === 'css') {
    return {
      backgroundImage: wp.css,
      backgroundRepeat: wp.repeat ? 'repeat' : 'no-repeat',
      backgroundSize: wp.size || 'cover',
    };
  }
  if (wp.type === 'solid') {
    return {
      backgroundColor: wp.css || 'transparent',
    };
  }
  return {
    backgroundColor: 'transparent',
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  isDirectChat: boolean;
  recipient: User | null;
  onStartChatGreeting?: () => void;
  selectedMessageIds: string[];
  isSelectMode: boolean;
  onToggleSelect: (e: React.MouseEvent, messageId: string) => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenReactionsModal: (messageId: string, initialEmoji?: string) => void;
  onOpenReactionPicker: (messageId: string) => void;
  reactionPickerMessageId: string | null;
  onPollVote: (messageId: string, optionId: string) => void;
  onMediaClick: (media: { url: string; title: string; type: 'image' | 'video' }) => void;
  matchedMessageIndices: number[];
  currentSearchIndex: number;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  conversationId?: string;
  disappearingTimer?: string;
  onOpenDisappearingModal?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  conversationId,
  currentUserId,
  isDirectChat,
  recipient,
  onStartChatGreeting,
  selectedMessageIds,
  isSelectMode,
  onToggleSelect,
  onReply,
  onReact,
  onOpenReactionsModal,
  onOpenReactionPicker,
  reactionPickerMessageId,
  onPollVote,
  onMediaClick,
  matchedMessageIndices,
  currentSearchIndex,
  messagesEndRef,
  disappearingTimer,
  onOpenDisappearingModal,
}) => {
  const { getEffectiveWallpaper, getEffectiveDim } = useWallpaperStore();
  const activeWallpaper = getEffectiveWallpaper(conversationId, currentUserId);
  const wallpaperDim = getEffectiveDim(conversationId, currentUserId);

  const hasDisappearingNoticeInMessages = messages.some(
    (m) =>
      m.messageType === 'system' ||
      Boolean(m.content?.startsWith('You turned on disappearing messages')) ||
      Boolean(m.content?.startsWith('You turned off disappearing messages'))
  );

  const durationLabel =
    disappearingTimer === '24h'
      ? '24 hours'
      : disappearingTimer === '7d'
      ? '7 days'
      : disappearingTimer === '90d'
      ? '90 days'
      : '';
  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full">
      {/* Active Chat Wallpaper Background (Stationary, 100% full conversation area coverage) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {activeWallpaper.id === 'sarissa-honeycomb' ? (
          <HoneycombBackground />
        ) : (
          <div
            className={`absolute inset-0 transition-all duration-300 ${
              activeWallpaper.id === 'solid-none' ? 'bg-[#FCDDE6]' : 'bg-zinc-950'
            }`}
            style={getWallpaperStyle(activeWallpaper)}
          />
        )}
        {wallpaperDim > 0 && (
          <div
            className="absolute inset-0 bg-black transition-opacity duration-200"
            style={{ opacity: wallpaperDim / 100 }}
          />
        )}
      </div>

      {/* Scrollable Messages Viewport */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-3 sm:py-4">
        {/* Messages Viewport Container */}
        <div className="relative flex flex-col gap-1 min-h-full justify-end">
        {messages.length === 0 ? (
          <div className="my-auto py-8">
            {durationLabel && (
              <div className="flex justify-center mb-6 px-3 sm:px-6 select-none w-full">
                <div className="bg-white dark:bg-[#1f2c34] border border-[#E9EDEF] dark:border-white/10 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs max-w-xl text-center text-[13.5px] sm:text-[14px] text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                  <WhatsAppDottedClockIcon className="w-4 h-4 inline-block -mt-0.5 mr-1.5 text-[#54656F] dark:text-[#8696A0] align-middle shrink-0" />
                  <span>
                    You turned on disappearing messages. New messages will disappear from this chat {durationLabel} after they&apos;re sent, except when kept.{' '}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenDisappearingModal}
                    className="text-[#1D6385] dark:text-[#53BDEB] hover:text-[#134259] dark:hover:text-[#8AD4F5] font-medium hover:underline cursor-pointer inline focus:outline-none transition-colors"
                  >
                    Change timer.
                  </button>
                </div>
              </div>
            )}
            <FreshConversationGreeting
              onSendWave={onStartChatGreeting || (() => {})}
            />
          </div>
        ) : (
          <>
            {/* Top Disappearing Messages Banner if active and no system notice in message history */}
            {!hasDisappearingNoticeInMessages && durationLabel && (
              <div className="flex justify-center my-2.5 px-3 sm:px-6 select-none w-full">
                <div className="bg-white dark:bg-[#1f2c34] border border-[#E9EDEF] dark:border-white/10 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs max-w-xl text-center text-[13.5px] sm:text-[14px] text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                  <WhatsAppDottedClockIcon className="w-4 h-4 inline-block -mt-0.5 mr-1.5 text-[#54656F] dark:text-[#8696A0] align-middle shrink-0" />
                  <span>
                    You turned on disappearing messages. New messages will disappear from this chat {durationLabel} after they&apos;re sent, except when kept.{' '}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenDisappearingModal}
                    className="text-[#1D6385] dark:text-[#53BDEB] hover:text-[#134259] dark:hover:text-[#8AD4F5] font-medium hover:underline cursor-pointer inline focus:outline-none transition-colors"
                  >
                    Change timer.
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

              // Date divider check
              const showDateDivider =
                idx === 0 || (prevMsg && isDifferentCalendarDay(prevMsg.createdAt, msg.createdAt));

              // Grouping consecutive messages from same sender
              const currentSenderId =
                typeof msg.senderId === 'object' && msg.senderId !== null
                  ? (msg.senderId as { _id?: string })._id
                  : msg.senderId;
              const prevSenderId =
                prevMsg && typeof prevMsg.senderId === 'object' && prevMsg.senderId !== null
                  ? (prevMsg.senderId as { _id?: string })._id
                  : prevMsg?.senderId;
              const nextSenderId =
                nextMsg && typeof nextMsg.senderId === 'object' && nextMsg.senderId !== null
                  ? (nextMsg.senderId as { _id?: string })._id
                  : nextMsg?.senderId;

              const isFirstInGroup = Boolean(currentSenderId !== prevSenderId || showDateDivider);
              const isLastInGroup = Boolean(currentSenderId !== nextSenderId);

              // Sender name & avatar resolution
              const senderObj =
                typeof msg.senderId === 'object' && msg.senderId !== null
                  ? (msg.senderId as User)
                  : null;
              const senderName = senderObj?.fullName || (isDirectChat && recipient ? recipient.fullName : 'User');
              const senderAvatar = senderObj?.avatar;

              // Search highlight check
              const isMatched = matchedMessageIndices.includes(idx);
              const isCurrentSearchMatch =
                isMatched && matchedMessageIndices[currentSearchIndex] === idx;

              return (
                <React.Fragment key={msg._id || idx}>
                  {/* Calendar Day Divider Badge */}
                  {showDateDivider && (
                    <div className="flex justify-center my-3 select-none">
                      <span className="px-3 py-1 rounded-full bg-white/70 backdrop-blur-xs border border-white/90 text-xs font-handwriting font-bold text-[#3B342B] shadow-2xs tracking-wide">
                        {formatMessageDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble Item */}
                  <MessageBubble
                    message={msg}
                    allMessages={messages}
                    currentUserId={currentUserId}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    showSenderName={!isDirectChat || isFirstInGroup}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    isSelected={selectedMessageIds.includes(msg._id)}
                    isSelectMode={isSelectMode}
                    onToggleSelect={onToggleSelect}
                    onReply={onReply}
                    onReact={onReact}
                    onOpenReactionsModal={onOpenReactionsModal}
                    onOpenReactionPicker={onOpenReactionPicker}
                    isReactionPickerOpen={reactionPickerMessageId === msg._id}
                    onPollVote={onPollVote}
                    onMediaClick={onMediaClick}
                    searchHighlight={isCurrentSearchMatch}
                    onOpenDisappearingModal={onOpenDisappearingModal}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-2 flex-shrink-0" />
      </div>
    </div>
  </div>
  );
};
