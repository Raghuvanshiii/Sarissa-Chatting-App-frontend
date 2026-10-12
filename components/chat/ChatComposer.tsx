'use client';

import React from 'react';
import { 
  Plus, 
  Send, 
  Mic, 
  Trash2, 
  X, 
  Smile, 
  Loader2,
  Video
} from 'lucide-react';
import { Attachment, Message } from '../../types';
import { AttachmentMenu } from './AttachmentMenu';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { getMediaUrl } from '../../hooks/useChatAreaLogic';
import { QuotedMessagePreview } from './QuotedMessagePreview';

interface ChatComposerProps {
  composerText: string;
  onComposerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  isSending: boolean;
  replyingTo: Message | null;
  onClearReply: () => void;
  pendingAttachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
  isUploadingAttachment: boolean;
  uploadProgress: number;
  isRecordingAudio: boolean;
  formattedAudioTimer: string;
  onStartAudioRecording: () => void;
  onStopAudioRecording: () => void;
  onCancelAudioRecording: () => void;
  onOpenCamera: () => void;
  isAttachmentMenuOpen: boolean;
  setIsAttachmentMenuOpen: (open: boolean) => void;
  attachmentButtonRef: React.RefObject<HTMLButtonElement | null>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  composerInputRef: React.RefObject<HTMLInputElement | null>;
  onTriggerFileInput: (type: 'media' | 'document' | 'audio') => void;
  onOpenPollModal: () => void;
  onOpenContactModal: () => void;
  onOpenStickerModal: () => void;
  onSendSticker?: (stickerUrl: string) => void;
  onSendGif?: (gifUrl: string) => void;
  isAuthenticated: boolean;
  hasActiveConversation: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  composerText,
  onComposerChange,
  onSendMessage,
  isSending,
  replyingTo,
  onClearReply,
  pendingAttachments,
  onRemoveAttachment,
  isUploadingAttachment,
  uploadProgress,
  isRecordingAudio,
  formattedAudioTimer,
  onStartAudioRecording,
  onStopAudioRecording,
  onCancelAudioRecording,
  onOpenCamera,
  isAttachmentMenuOpen,
  setIsAttachmentMenuOpen,
  attachmentButtonRef,
  showEmojiPicker,
  setShowEmojiPicker,
  composerInputRef,
  onTriggerFileInput,
  onOpenPollModal,
  onOpenContactModal,
  onOpenStickerModal,
  onSendSticker,
  onSendGif,
  isAuthenticated,
  hasActiveConversation,
}) => {
  const canSend = Boolean(composerText.trim() || pendingAttachments.length > 0);

  return (
    <footer className="flex-shrink-0 sticky bottom-0 bg-[#FCEBED] border-t border-[#F7CAD0] px-2 sm:px-4 py-2 sm:py-2.5 z-20 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Replying Banner */}
      {replyingTo && (
        <QuotedMessagePreview
          message={replyingTo}
          context="composer"
          onClose={onClearReply}
        />
      )}

      {/* Pending Attachments List & Uploading Progress */}
      {(pendingAttachments.length > 0 || isUploadingAttachment) && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1">
          {pendingAttachments.map((att, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-[#F7CAD0] bg-white group shadow-2xs"
            >
              {att.resourceType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getMediaUrl(att.url)} alt="upload" className="w-full h-full object-cover" />
              ) : att.resourceType === 'video' ? (
                <div className="relative w-full h-full bg-black/90 flex items-center justify-center">
                  <video src={getMediaUrl(att.url)} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white">
                      <Video className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-[11px] text-[#2D151D]">
                  <span className="font-bold truncate max-w-full">{att.originalName}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemoveAttachment(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition cursor-pointer"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {isUploadingAttachment && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-[#F7CAD0] text-xs text-[#7C5362] shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#E05375]" />
              <span className="font-medium">Uploading... {uploadProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Live Voice Recording Mode */}
      {isRecordingAudio ? (
        <div className="flex items-center justify-between gap-3 p-2 bg-[#FFF0F3] border border-[#F7CAD0] rounded-full animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-center gap-3 pl-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05375] opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#E05375]" />
            </span>
            <span className="text-sm font-bold text-[#E05375] font-mono tracking-wider">
              {formattedAudioTimer}
            </span>
            <span className="text-xs text-[#7C5362] ml-1">
              Recording voice note...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelAudioRecording}
              className="p-2 rounded-full text-[#7C5362] hover:text-[#E05375] hover:bg-[#FAD0D8] transition cursor-pointer"
              title="Discard voice message"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={onStopAudioRecording}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs"
              title="Send voice message"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Composer Row matching Sarissa Wouts Mockup */
        <form onSubmit={onSendMessage} className="flex items-center gap-1.5 sm:gap-3 w-full">
          {/* Left Action: Circular Light Pink Plus (+) Button */}
          <div className="relative flex-shrink-0">
            <button
              ref={attachmentButtonRef}
              type="button"
              onClick={() => {
                setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                if (showEmojiPicker) setShowEmojiPicker(false);
              }}
              disabled={!isAuthenticated || !hasActiveConversation}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FAD0D8] text-[#741E34] hover:bg-[#F5BAC6] flex items-center justify-center font-bold text-lg sm:text-xl transition cursor-pointer shadow-2xs disabled:opacity-50 active:scale-95 flex-shrink-0"
              title="Add attachment, poll, or contact"
            >
              <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.4]" />
            </button>

            {/* Attachment Menu Popup */}
            <AttachmentMenu
              isOpen={isAttachmentMenuOpen}
              onClose={() => setIsAttachmentMenuOpen(false)}
              anchorRef={attachmentButtonRef}
              onSelectDocument={() => onTriggerFileInput('document')}
              onSelectPhotosVideos={() => onTriggerFileInput('media')}
              onSelectCamera={onOpenCamera}
              onSelectContact={onOpenContactModal}
              onSelectPoll={onOpenPollModal}
              onSelectAudio={() => onTriggerFileInput('audio')}
              onSelectNewSticker={onOpenStickerModal}
            />
          </div>

          {/* Center: Rounded Full White Pill Capsule with embedded icons */}
          <div className="relative flex-1 min-w-0 flex items-center bg-white border border-[#F3CAD4] rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 shadow-2xs focus-within:border-[#E05375]">
            <input
              ref={composerInputRef}
              type="text"
              value={composerText}
              onChange={onComposerChange}
              placeholder="Type a message..."
              disabled={!isAuthenticated || !hasActiveConversation}
              className="w-full bg-transparent border-none py-1 text-[#2D151D] text-base placeholder:text-[#7C5362]/60 focus:outline-none min-w-0"
            />

            {/* Embedded Action Icons inside Pill: Emoji and Audio Recording */}
            <div className="flex items-center gap-1 text-[#8F6473] flex-shrink-0 ml-1">
              {/* Emoji Picker Trigger */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded-full hover:text-[#741E34] transition cursor-pointer"
                title="Emoji"
              >
                <Smile className="w-4.5 h-4.5 stroke-[1.8]" />
              </button>

              {/* Audio Recording Trigger */}
              <button
                type="button"
                onClick={onStartAudioRecording}
                disabled={!isAuthenticated || !hasActiveConversation}
                className="p-1 rounded-full hover:text-[#741E34] transition cursor-pointer disabled:opacity-40"
                title="Record voice note"
              >
                <Mic className="w-4.5 h-4.5 stroke-[1.8]" />
              </button>
            </div>

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <EmojiPickerPopover
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelectEmoji={(emoji) => {
                  onComposerChange({
                    target: { value: composerText + emoji },
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                onSelectSticker={(stickerUrl) => {
                  if (onSendSticker) {
                    onSendSticker(stickerUrl);
                  }
                  setShowEmojiPicker(false);
                }}
                onSelectGif={(gifUrl) => {
                  if (onSendGif) {
                    onSendGif(gifUrl);
                  }
                  setShowEmojiPicker(false);
                }}
              />
            )}
          </div>

          {/* Far Right: Dark Pink / Raspberry Send Button */}
          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={isSending || isUploadingAttachment || !canSend || !isAuthenticated || !hasActiveConversation}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white flex items-center justify-center font-cute text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none flex-shrink-0"
              title="Send message"
            >
              {isSending || isUploadingAttachment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </form>
      )}
    </footer>
  );
};
