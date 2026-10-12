'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  CornerDownRight, 
  FileText, 
  Download, 
  Play, 
  Film,
  Music,
  Smile,
  Reply,
  Trash2,
  CheckSquare,
  Ban,
  Plus
} from 'lucide-react';
import { Message, User, Reaction } from '../../types';
import { parseSpecialMessage, formatFileSize, getMediaUrl, QUICK_EMOJIS } from '../../hooks/useChatAreaLogic';
import { WhatsAppPollCard } from './WhatsAppPollCard';
import { WhatsAppContactCard } from './WhatsAppContactCard';
import { WhatsAppEmoji, renderMessageWithWhatsAppEmojis } from './WhatsAppEmoji';
import { WhatsAppDottedClockIcon } from './ConversationMenu';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { QuotedMessagePreview } from './QuotedMessagePreview';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSenderName: boolean;
  senderName: string;
  senderAvatar?: string;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (e: React.MouseEvent, messageId: string) => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenReactionsModal: (messageId: string, initialEmoji?: string) => void;
  onOpenReactionPicker: (messageId: string) => void;
  isReactionPickerOpen: boolean;
  onPollVote: (messageId: string, optionId: string) => void;
  onMediaClick: (media: { url: string; title: string; type: 'image' | 'video' }) => void;
  searchHighlight?: boolean;
  onOpenDisappearingModal?: () => void;
  allMessages?: Message[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isFirstInGroup,
  isLastInGroup,
  showSenderName,
  senderName,
  senderAvatar,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onReply,
  onReact,
  onOpenReactionsModal,
  onOpenReactionPicker,
  isReactionPickerOpen,
  onPollVote,
  onMediaClick,
  searchHighlight = false,
  onOpenDisappearingModal,
  allMessages,
}) => {
  const [showFullReactionPicker, setShowFullReactionPicker] = useState(false);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quickBarRef = useRef<HTMLDivElement>(null);

  const isPickerVisible = isReactionPickerOpen || isHoverOpen;

  const handleEmojiMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverOpen(true);
  };

  const handleEmojiMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(false);
      if (isReactionPickerOpen) {
        onOpenReactionPicker(message._id);
      }
    }, 150);
  };

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Close quick reaction bar when clicking outside
  useEffect(() => {
    if (!isPickerVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (quickBarRef.current && !quickBarRef.current.contains(e.target as Node)) {
        setIsHoverOpen(false);
        if (isReactionPickerOpen) {
          onOpenReactionPicker(message._id);
        }
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isPickerVisible, isReactionPickerOpen, message._id, onOpenReactionPicker]);

  const isSelf = typeof message.senderId === 'object' && message.senderId !== null
    ? (message.senderId as { _id?: string })._id === currentUserId
    : message.senderId === currentUserId;

  const isSystem =
    message.messageType === 'system' ||
    Boolean(message.content?.startsWith('You turned on disappearing messages')) ||
    Boolean(message.content?.startsWith('You turned off disappearing messages'));

  const contentLower = (message.content || '').toLowerCase();
  const isDisappearingNotice =
    isSystem &&
    (contentLower.includes('disappearing') || contentLower.includes('change timer'));

  if (isDisappearingNotice) {
    let displayText = message.content || '';
    if (!isSelf && displayText.startsWith('You turned')) {
      displayText = displayText.replace(/^You turned/, `${senderName} turned`);
    }
    const baseText = displayText.replace(/\s*Change timer\.?\s*$/i, '').trim();

    return (
      <div className="flex justify-center my-2.5 px-3 sm:px-6 select-none w-full">
        <div className="bg-white dark:bg-[#1f2c34] border border-[#E9EDEF] dark:border-white/10 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs max-w-xl text-center text-[13.5px] sm:text-[14px] text-[#54656F] dark:text-[#8696A0] leading-relaxed">
          <WhatsAppDottedClockIcon className="w-4 h-4 inline-block -mt-0.5 mr-1.5 text-[#54656F] dark:text-[#8696A0] align-middle shrink-0" />
          <span>{baseText} </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDisappearingModal?.();
            }}
            className="text-[#1D6385] dark:text-[#53BDEB] hover:text-[#134259] dark:hover:text-[#8AD4F5] font-medium hover:underline cursor-pointer inline focus:outline-none transition-colors"
          >
            Change timer.
          </button>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-2.5 px-4 select-none w-full">
        <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-xs border border-[#EBE3E5] dark:border-white/10 text-xs text-[#54656F] dark:text-gray-300 font-medium shadow-2xs">
          {message.content}
        </span>
      </div>
    );
  }

  const isDeleted = Boolean(message.deletedForEveryone);
  const specialData = !isDeleted ? parseSpecialMessage(message.content) : null;
  const isPoll = specialData?._type === 'poll';
  const isContact = specialData?._type === 'contact';
  const isSticker = specialData?._type === 'sticker' || specialData?._type === 'gif';

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Outgoing Bubble: Sunny Butter Yellow
  // Incoming Bubble: Crisp Pure White with subtle blush border
  const bubbleBgClass = isSelf
    ? 'bg-[#FFF275] border-[#EBD04D] text-[#2D2319]'
    : 'bg-white border-[#F3CAD4] text-[#2D2319] shadow-2xs';

  return (
    <div
      id={`msg-${message._id}`}
      onClick={(e) => {
        if (isSelectMode) onToggleSelect(e, message._id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleSelect(e, message._id);
      }}
      className={`relative group flex gap-2.5 px-3 py-1 transition-colors select-none ${
        isSelf ? 'justify-end' : 'justify-start'
      } ${
        isSelectMode ? 'cursor-pointer hover:bg-black/[0.02]' : ''
      } ${
        isSelected ? 'bg-[#E05375]/10 rounded-2xl ring-1 ring-[#E05375]/30' : ''
      }`}
    >
      {/* Selection Checkbox in Select Mode */}
      {isSelectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(e, message._id);
          }}
          className="flex items-center justify-center self-center px-1 flex-shrink-0 cursor-pointer animate-in zoom-in-75 duration-100 order-first"
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-[#E05375] text-white shadow-xs scale-105'
                : 'border-2 border-[#D4A5B0] bg-white hover:border-[#E05375]'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>
      )}
      {/* Incoming Message Avatar (rendered beside the first message in group) */}
      {!isSelf && (
        <div className="w-8 h-8 flex-shrink-0 self-start mt-0.5">
          {isFirstInGroup ? (
            senderAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={senderAvatar}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#FAD0D8] text-[#741E34] text-xs font-bold flex items-center justify-center shadow-2xs">
                {senderName.slice(0, 2).toUpperCase()}
              </div>
            )
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      {/* Bubble Container & Sender Header */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[72%] ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Incoming Sender Name */}
        {!isSelf && showSenderName && isFirstInGroup && (
          <span className="text-xs font-bold text-[#741E34] px-1 mb-0.5 tracking-tight">
            {senderName}
          </span>
        )}

        {/* The Card Bubble */}
        <div
          className={`relative border-[1.5px] rounded-2xl px-3.5 py-2 shadow-xs transition-shadow ${bubbleBgClass} ${
            searchHighlight ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          {/* Outgoing Top-Right Beak Tail */}
          {isSelf && isFirstInGroup && (
            <span
              className="absolute -top-[1.5px] -right-[8px] w-0 h-0 border-t-[8px] border-t-[#FFF275] border-r-[8px] border-r-transparent pointer-events-none drop-shadow-[0_1px_0_#EBD04D]"
              aria-hidden="true"
            />
          )}

          {/* Incoming Left Beak Tail */}
          {!isSelf && isFirstInGroup && (
            <span
              className="absolute top-[8px] -left-[8px] w-0 h-0 border-t-[8px] border-t-transparent border-r-[8px] border-r-white border-b-[8px] border-b-transparent pointer-events-none drop-shadow-[-1px_0_0_#F3CAD4]"
              aria-hidden="true"
            />
          )}

          {/* Replying quote preview box */}
          {message.replyTo && typeof message.replyTo === 'object' && !isDeleted && (
            <QuotedMessagePreview
              message={message.replyTo}
              context="bubble"
              allMessages={allMessages}
              onClick={() => {
                const targetId =
                  typeof message.replyTo === 'object' ? message.replyTo?._id : message.replyTo;
                if (targetId) {
                  const el = document.getElementById(`msg-${targetId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-[#E05375]', 'transition-all');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-[#E05375]');
                    }, 1500);
                  }
                }
              }}
            />
          )}

          {/* Deleted Message */}
          {isDeleted ? (
            <p className="italic text-xs text-black/60 flex items-center gap-1.5 py-0.5 select-none">
              <Ban className="w-3.5 h-3.5 text-black/40 stroke-[2] flex-shrink-0" />
              <span>{isSelf ? 'You deleted this message' : 'This message was deleted'}</span>
            </p>
          ) : isPoll ? (
            /* Poll Card */
            <WhatsAppPollCard
              poll={specialData}
              isOwn={isSelf}
              onVote={(optionId) => onPollVote(message._id, optionId)}
            />
          ) : isContact ? (
            /* Contact Card */
            <WhatsAppContactCard contact={specialData} isOwn={isSelf} />
          ) : isSticker ? (
            /* Sticker or GIF */
            <div
              className="py-1 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() =>
                onMediaClick({
                  url: specialData.url,
                  title: specialData.name || (specialData._type === 'gif' ? 'GIF' : 'Sticker'),
                  type: 'image',
                })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={specialData.url}
                alt={specialData.name || 'Sticker'}
                className={
                  specialData.name === 'GIF' || specialData._type === 'gif'
                    ? 'max-w-64 max-h-64 rounded-xl object-contain'
                    : 'w-32 h-32 object-contain'
                }
              />
            </div>
          ) : (
            /* Standard Text & Attachments */
            <div>
              {/* Staged Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="grid gap-2 mb-2">
                  {message.attachments.map((att, idx) => {
                    const isImg = att.resourceType === 'image';
                    const isVid = att.resourceType === 'video';
                    const fullUrl = getMediaUrl(att.url);
                    const isPdf = att.originalName?.toLowerCase().endsWith('.pdf') || att.mimeType?.includes('pdf');

                    if (isImg) {
                      return (
                        <div
                          key={idx}
                          onClick={() => onMediaClick({ url: fullUrl, title: att.originalName, type: 'image' })}
                          className="rounded-xl overflow-hidden cursor-pointer hover:opacity-95 max-h-72"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fullUrl}
                            alt={att.originalName}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      );
                    }

                    if (isVid) {
                      return (
                        <div
                          key={idx}
                          onClick={() => onMediaClick({ url: fullUrl, title: att.originalName, type: 'video' })}
                          className="relative rounded-xl overflow-hidden cursor-pointer max-h-72 bg-black/10"
                        >
                          <video src={fullUrl} className="w-full h-full object-cover rounded-xl" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-10 h-10 text-white fill-white" />
                          </div>
                        </div>
                      );
                    }

                    if (att.resourceType === 'audio') {
                      return (
                        <div key={idx} className="p-2 bg-black/5 rounded-xl flex items-center gap-2">
                          <Music className="w-5 h-5 text-black/70 flex-shrink-0" />
                          <audio src={fullUrl} controls className="w-full h-8" />
                        </div>
                      );
                    }

                    // Document / PDF Card matching mockup
                    return (
                      <a
                        key={idx}
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#F3CAD4] hover:bg-black/5 transition shadow-2xs"
                      >
                        {isPdf ? (
                          <div className="w-9 h-9 rounded-lg bg-[#E53935] text-white flex items-center justify-center font-bold text-[12px] shadow-2xs flex-shrink-0">
                            PDF
                          </div>
                        ) : (
                          <FileText className="w-6 h-6 text-[#E05375] flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-[#2D151D]">{att.originalName}</p>
                          <p className="text-[12px] text-[#7C5362] font-mono">{formatFileSize(att.size)}</p>
                        </div>
                        <Download className="w-4 h-4 text-[#7C5362] hover:text-[#2D151D] flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Message text with clean typography matching mockup */}
              {message.content && (
                <p className="text-[16px] sm:text-base leading-snug whitespace-pre-wrap break-words tracking-normal font-sans font-normal text-[#2D151D]">
                  {renderMessageWithWhatsAppEmojis(message.content)}
                </p>
              )}
            </div>
          )}

          {/* Bottom Timestamp & Delivery Status */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[12px] text-[#7C5362] font-medium">
            <span>{timeString}</span>
            {isSelf && !isDeleted && (
              <span className="flex-shrink-0">
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[#5D7E30] stroke-[2.5]" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-zinc-500 stroke-[2]" />
                ) : message.status === 'sent' ? (
                  <Check className="w-3.5 h-3.5 text-zinc-500 stroke-[2]" />
                ) : (
                  <Clock className="w-3 h-3 text-zinc-400" />
                )}
              </span>
            )}
          </div>

          {/* Reactions Pill Overlay */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenReactionsModal(message._id);
              }}
              className="absolute -bottom-3 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border border-[#E0DCD5] shadow-xs cursor-pointer hover:scale-105 transition-transform"
            >
              {message.reactions.slice(0, 4).map((r, i) => (
                <span key={i} className="inline-flex items-center">
                  <WhatsAppEmoji emoji={r.emoji} size={15} />
                </span>
              ))}
              {message.reactions.length > 1 && (
                <span className="text-[11px] font-bold text-black/70 ml-0.5">
                  {message.reactions.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover Quick Action Buttons (Reply / Reaction / Select) */}
        {!isSelectMode && (
          <div
            className={`transition-opacity flex items-center gap-1 mt-1 px-1 ${
              isPickerVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${isSelf ? 'justify-end' : 'justify-start'}`}
          >
            {!isDeleted && (
              <>
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  className="p-1 rounded-full text-black/50 hover:text-black hover:bg-black/10 transition cursor-pointer"
                  title="Reply"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>

                {/* Emoji Reaction Trigger with Hover Popover */}
                <div
                  className="relative inline-flex items-center"
                  onMouseEnter={handleEmojiMouseEnter}
                  onMouseLeave={handleEmojiMouseLeave}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPickerVisible) {
                        setIsHoverOpen(false);
                        if (isReactionPickerOpen) onOpenReactionPicker(message._id);
                      } else {
                        setIsHoverOpen(true);
                      }
                    }}
                    className={`p-1 rounded-full transition cursor-pointer ${
                      isPickerVisible
                        ? 'text-[#C24A68] bg-[#FCE7EC]'
                        : 'text-black/50 hover:text-black hover:bg-black/10'
                    }`}
                    title="Add reaction"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  {/* Quick Emojis Popover Bar on Hover */}
                  {isPickerVisible && (
                    <div
                      ref={quickBarRef}
                      onMouseEnter={handleEmojiMouseEnter}
                      onMouseLeave={handleEmojiMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bottom-full mb-1.5 ${
                        isSelf ? 'right-0' : 'left-0'
                      } flex items-center gap-1.5 p-1.5 bg-[#FFF5F7] rounded-full shadow-lg border border-[#F5BAC6] z-40 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap`}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onReact(message._id, emoji);
                            setIsHoverOpen(false);
                            if (isReactionPickerOpen) onOpenReactionPicker(message._id);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer"
                        >
                          <WhatsAppEmoji emoji={emoji} size={18} />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFullReactionPicker(true);
                          setIsHoverOpen(false);
                          if (isReactionPickerOpen) onOpenReactionPicker(message._id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FCE7EC] hover:bg-[#FAD0D8] text-[#741E34] hover:text-[#9F2241] transition cursor-pointer hover:scale-115 active:scale-95 border border-[#F5BAC6] shadow-2xs ml-0.5"
                        title="More emojis"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(e, message._id);
              }}
              className="p-1 rounded-full text-black/50 hover:text-[#E05375] hover:bg-black/10 transition cursor-pointer"
              title="Select message"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Full Emoji Reaction Picker Modal */}
        {showFullReactionPicker && (
          <EmojiPickerPopover
            isOpen={showFullReactionPicker}
            isModal={true}
            title="React with Emoji"
            onClose={() => setShowFullReactionPicker(false)}
            onSelectEmoji={(emoji) => {
              onReact(message._id, emoji);
              setShowFullReactionPicker(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
