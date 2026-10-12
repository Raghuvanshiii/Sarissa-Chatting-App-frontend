'use client';

import React from 'react';
import {
  Camera,
  Video,
  Play,
  FileText,
  Music,
  Mic,
  Film,
  Sparkles,
  BarChart2,
  User,
  X,
} from 'lucide-react';
import { Message } from '../../types';
import { getMediaUrl } from '../../hooks/useChatAreaLogic';
import { renderMessageWithWhatsAppEmojis } from './WhatsAppEmoji';

export interface QuotedMessagePreviewProps {
  message: Message;
  context?: 'bubble' | 'composer';
  onClose?: () => void;
  onClick?: () => void;
  allMessages?: Message[];
}

/**
 * Resilient parser that detects special JSON payloads (gifs, stickers, polls, contacts)
 * even if string formatting or fields vary slightly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAnySpecialContent(content?: string): any {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        if (
          obj._type === 'gif' ||
          obj._type === 'sticker' ||
          (obj.url && (obj.url.endsWith('.gif') || obj.url.includes('giphy') || obj.name))
        ) {
          return {
            _type: obj._type || (obj.url?.endsWith('.gif') ? 'gif' : 'sticker'),
            url: obj.url,
            name: obj.name || (obj.url?.endsWith('.gif') ? 'GIF' : 'Sticker'),
          };
        }
        if (obj._type === 'poll' || (obj.question && obj.options)) {
          return { _type: 'poll', question: obj.question, options: obj.options };
        }
        if (obj._type === 'contact' || obj.phone || obj.name) {
          return { _type: 'contact', name: obj.name, phone: obj.phone };
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

export const QuotedMessagePreview: React.FC<QuotedMessagePreviewProps> = ({
  message,
  context = 'bubble',
  onClose,
  onClick,
  allMessages,
}) => {
  // Resolve full message details from allMessages if shallow populated from database
  const resolvedMsg: Message = React.useMemo(() => {
    if (allMessages && message._id) {
      const full = allMessages.find((m) => m._id === message._id);
      if (full) {
        return {
          ...full,
          senderId: message.senderId || full.senderId,
        };
      }
    }
    return message;
  }, [message, allMessages]);

  const senderName =
    typeof resolvedMsg.senderId === 'object' && resolvedMsg.senderId !== null
      ? (resolvedMsg.senderId as { fullName?: string; username?: string }).fullName ||
        (resolvedMsg.senderId as { username?: string }).username ||
        'User'
      : 'User';

  const specialData = parseAnySpecialContent(resolvedMsg.content);
  const attachments = resolvedMsg.attachments || [];

  const isGifOrSticker = Boolean(
    specialData?._type === 'gif' || specialData?._type === 'sticker'
  );
  const imageAttachment =
    attachments.find((a) => a.resourceType === 'image') ||
    (resolvedMsg.messageType === 'image' && attachments.length > 0 ? attachments[0] : null);
  const videoAttachment =
    attachments.find((a) => a.resourceType === 'video') ||
    (resolvedMsg.messageType === 'video' && attachments.length > 0 ? attachments[0] : null);
  const docAttachment =
    attachments.find((a) => a.resourceType === 'document' || a.resourceType === 'raw') ||
    (resolvedMsg.messageType === 'document' && attachments.length > 0 ? attachments[0] : null);
  const audioAttachment =
    attachments.find((a) => a.resourceType === 'audio') ||
    (resolvedMsg.messageType === 'audio' && attachments.length > 0 ? attachments[0] : null);
  const isPoll = Boolean(specialData?._type === 'poll');
  const isContact = Boolean(specialData?._type === 'contact');

  // Text caption associated with media
  const caption =
    resolvedMsg.content &&
    !specialData &&
    !resolvedMsg.content.trim().startsWith('{')
      ? resolvedMsg.content.trim()
      : '';

  // Render thumbnail preview element if message contains visual/structured media
  const renderThumbnail = () => {
    if (isGifOrSticker && specialData?.url) {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/5 border border-black/10 shadow-2xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={specialData.url}
            alt={specialData.name || 'GIF'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (imageAttachment?.url) {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/5 border border-black/10 shadow-2xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(imageAttachment.url)}
            alt="Photo"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (videoAttachment?.url) {
      return (
        <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/80 border border-black/10 shadow-2xs">
          <video
            src={getMediaUrl(videoAttachment.url)}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white">
              <Play className="w-2.5 h-2.5 fill-white" />
            </div>
          </div>
        </div>
      );
    }

    if (docAttachment) {
      const ext = docAttachment.originalName?.split('.').pop() || 'FILE';
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#FFEBF0] text-[#C24A68] border border-[#F5BAC6] flex flex-col items-center justify-center flex-shrink-0 shadow-2xs">
          <FileText className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase truncate max-w-[32px] tracking-tight">
            {ext}
          </span>
        </div>
      );
    }

    if (audioAttachment) {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#FFEBF0] text-[#C24A68] border border-[#F5BAC6] flex items-center justify-center flex-shrink-0 shadow-2xs">
          <Music className="w-4 h-4" />
        </div>
      );
    }

    if (isPoll) {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#FFF2E2] text-[#E07A5F] border border-[#FAD2C0] flex items-center justify-center flex-shrink-0 shadow-2xs">
          <BarChart2 className="w-4 h-4" />
        </div>
      );
    }

    if (isContact) {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#EBF5FB] text-[#2980B9] border border-[#AED6F1] flex items-center justify-center flex-shrink-0 shadow-2xs">
          <User className="w-4 h-4" />
        </div>
      );
    }

    return null;
  };

  // Render label / caption line on the left side
  const renderMediaInfo = () => {
    if (isGifOrSticker) {
      const isGif = specialData?._type === 'gif' || specialData?.name === 'GIF';
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          {isGif ? (
            <Film className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          )}
          <span className="truncate">{isGif ? 'GIF' : (specialData?.name || 'Sticker')}</span>
        </div>
      );
    }

    if (imageAttachment) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <Camera className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          <span className="truncate">{caption || 'Photo'}</span>
        </div>
      );
    }

    if (videoAttachment) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <Video className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          <span className="truncate">{caption || 'Video'}</span>
        </div>
      );
    }

    if (docAttachment) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <FileText className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          <span className="truncate">{docAttachment.originalName || 'Document'}</span>
        </div>
      );
    }

    if (audioAttachment) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <Mic className="w-3.5 h-3.5 text-[#C24A68] flex-shrink-0" />
          <span className="truncate">Voice message</span>
        </div>
      );
    }

    if (isPoll) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <BarChart2 className="w-3.5 h-3.5 text-[#E07A5F] flex-shrink-0" />
          <span className="truncate font-semibold">{specialData?.question || 'Poll'}</span>
        </div>
      );
    }

    if (isContact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-[#2D151D] font-medium truncate">
          <User className="w-3.5 h-3.5 text-[#2980B9] flex-shrink-0" />
          <span className="truncate">{specialData?.name || 'Contact'}</span>
        </div>
      );
    }

    // Default: text message
    return (
      <p className="text-xs text-black/75 dark:text-gray-200 truncate block line-clamp-1 font-normal">
        {renderMessageWithWhatsAppEmojis(resolvedMsg.content || '')}
      </p>
    );
  };

  const thumbnail = renderThumbnail();

  // If used inside MessageBubble:
  if (context === 'bubble') {
    return (
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={`mb-2 p-2 rounded-xl bg-black/[0.04] dark:bg-white/10 hover:bg-black/[0.08] dark:hover:bg-white/15 border-l-4 border-amber-500 text-xs transition-colors flex items-center justify-between gap-2.5 ${
          onClick ? 'cursor-pointer' : ''
        }`}
        title={onClick ? 'Click to jump to replied message' : undefined}
      >
        <div className="min-w-0 flex-1">
          <span className="font-bold block truncate text-[#C24A68] text-xs mb-0.5">
            {senderName}
          </span>
          {renderMediaInfo()}
        </div>
        {thumbnail}
      </div>
    );
  }

  // If used inside ChatComposer (above the message input):
  return (
    <div className="mb-2 p-2 rounded-xl bg-white/95 border border-[#F7CAD0] border-l-4 border-l-[#C24A68] flex items-center justify-between gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-150 shadow-2xs select-none">
      <div className="min-w-0 flex-1">
        <span className="font-bold text-[#741E34] block truncate text-xs mb-0.5">
          Replying to {senderName}
        </span>
        {renderMediaInfo()}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {thumbnail}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7C5362] hover:text-[#E05375] hover:bg-[#FCEBED] transition cursor-pointer"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
