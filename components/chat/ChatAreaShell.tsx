'use client';

import React from 'react';
import { useChatAreaLogic, getMediaUrl } from '../../hooks/useChatAreaLogic';
import { apiService } from '../../services/api';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatComposer } from './ChatComposer';
import { CallModal } from './CallModal';
import { ReactionsModal } from './ReactionsModal';
import { CameraModal } from './CameraModal';
import { ContactModal, ContactData } from './ContactModal';
import { PollModal, PollData } from './PollModal';
import { StickerModal, StickerData } from './StickerModal';
import { ConversationMenu, DisappearingMessagesModal } from './ConversationMenu';
import { HoneycombBackground } from './HoneycombBackground';
import { StoryUploadStudio } from '../story/StoryUploadStudio';
import { useAppStore } from '../../store/useAppStore';
import {
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Trash2,
  Maximize2,
  Users,
  Phone
} from 'lucide-react';

export const ChatAreaShell: React.FC = () => {
  const logic = useChatAreaLogic();

  const { currentNavTab } = useAppStore();

  // If no conversation is selected, display empty state or dedicated Story Upload Studio
  if (!logic.activeConversation) {
    if (currentNavTab === 'stories') {
      return (
        <div className="relative flex-1 h-full min-h-0 flex flex-col overflow-hidden">
          <StoryUploadStudio />
          <CallModal
            isOpen={logic.isCallModalOpen}
            onClose={() => logic.setIsCallModalOpen(false)}
            callType={logic.activeCallType}
            isIncoming={logic.isIncomingCall}
            partner={logic.callPartner || { id: '', name: 'Call', isGroup: false }}
            callId={logic.activeCallId || undefined}
            conversationId={logic.activeCallConversationId || ''}
            onCallEnded={logic.handleCallEnded}
          />
        </div>
      );
    }

    const isContactsTab = currentNavTab === 'contacts';
    const isCallsTab = currentNavTab === 'calls';

    return (
      <main className="relative flex-1 h-full min-h-0 flex flex-col items-center justify-center select-none overflow-hidden">
        <HoneycombBackground />
        <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-md bg-[#FFF5F7]/90 backdrop-blur-md rounded-3xl border border-[#F5BAC6] shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-[#F09DAF] text-[#2D151D] flex items-center justify-center text-3xl font-bold shadow-xs mb-3">
            {isContactsTab ? (
              <Users className="w-8 h-8 text-[#741E34]" />
            ) : isCallsTab ? (
              <Phone className="w-8 h-8 text-[#741E34]" />
            ) : (
              <span>✉</span>
            )}
          </div>
          <h2 className="font-cute text-2xl sm:text-3xl font-bold text-[#2D151D]">
            {isContactsTab ? 'Your Contacts' : isCallsTab ? 'Calls & History' : 'Welcome to Chats'}
          </h2>
          <p className="text-sm font-cute text-[#7C5362] mt-1 max-w-xs leading-relaxed">
            {isContactsTab
              ? 'Select any contact from the list on the left to start a conversation, voice call, or share media.'
              : isCallsTab
              ? 'Select a contact or recent call from the left to start an audio or video call with crystal clear quality.'
              : 'Select a conversation from the left to start messaging, share photos, or catch up with friends.'}
          </p>
        </div>

        {/* Audio / Video Calling Modal (portal to document.body, functional even when no chat selected) */}
        <CallModal
          isOpen={logic.isCallModalOpen}
          onClose={() => logic.setIsCallModalOpen(false)}
          callType={logic.activeCallType}
          isIncoming={logic.isIncomingCall}
          partner={logic.callPartner || { id: '', name: 'Call', isGroup: false }}
          callId={logic.activeCallId || undefined}
          conversationId={logic.activeCallConversationId || ''}
          onCallEnded={logic.handleCallEnded}
        />
      </main>
    );
  }

  const isDirect = logic.activeConversation.type === 'direct';

  return (
    <main
      onDragOver={logic.handleDragOver}
      onDragLeave={logic.handleDragLeave}
      onDrop={logic.handleDrop}
      className="relative flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-[#FCDDE6] select-none"
    >
      {/* Hidden File Inputs for Document, Media, and Audio */}
      <input
        type="file"
        ref={logic.documentInputRef}
        onChange={logic.handleFileSelect}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        className="hidden"
      />
      <input
        type="file"
        ref={logic.mediaInputRef}
        onChange={logic.handleFileSelect}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={logic.audioInputRef}
        onChange={logic.handleFileSelect}
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
        className="hidden"
      />
      <input
        type="file"
        ref={logic.fileInputRef}
        onChange={logic.handleFileSelect}
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {logic.isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#F09DAF]/90 backdrop-blur-xs border-4 border-dashed border-white flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <p className="font-handwriting text-3xl font-bold">Drop files to share</p>
          <p className="font-cute text-sm opacity-90 mt-1">Upload images, audio, documents, and videos</p>
        </div>
      )}

      {/* 1. Header Bar */}
      <ChatHeader
        conversation={logic.activeConversation}
        recipient={logic.recipient}
        recipientPresence={logic.recipientPresence}
        typingUsers={logic.currentTypingUsers}
        isSelectMode={logic.isSelectMode && logic.selectedMessageIds.length > 0}
        selectedCount={logic.selectedMessageIds.length}
        onClearSelection={() => {
          logic.setSelectedMessageIds([]);
          logic.setIsSelectMode(false);
        }}
        onDeleteSelected={() => {
          logic.setMessagesToDelete(logic.selectedMessageIds);
          logic.setIsDeleteModalOpen(true);
        }}
        onBack={() => logic.setActiveConversation(null)}
        onStartCall={logic.handleStartCall}
        onToggleSearch={logic.toggleSearchInChat}
        onToggleMenu={() => logic.setIsMenuOpen((prev) => !prev)}
        onOpenDetails={logic.toggleDetailsPanel}
        isMuted={Boolean(logic.mutedConversations[logic.activeConversation._id])}
        threeDotsButtonRef={logic.threeDotsButtonRef}
      >
        {/* Three Dots Menu Dropdown */}
        <ConversationMenu
          isOpen={logic.isMenuOpen}
          onClose={() => logic.setIsMenuOpen(false)}
          anchorRef={logic.threeDotsButtonRef}
          activeConversation={logic.activeConversation}
          recipient={logic.recipient}
          messages={logic.activeMessages}
          onToggleSelectMode={() => logic.setIsSelectMode(true)}
          onToggleSearch={logic.toggleSearchInChat}
          onClearChat={logic.handleClearChat}
          onCloseChat={() => logic.setActiveConversation(null)}
          isMuted={Boolean(logic.mutedConversations[logic.activeConversation._id])}
          onToggleMute={(duration) => {
            const id = logic.activeConversation!._id;
            logic.setConversationMuted(id, duration);
          }}
          disappearingTimer={logic.disappearingTimers[logic.activeConversation._id] || 'off'}
          onSetDisappearingTimer={logic.handleSetDisappearingTimer}
          onOpenGroupInfo={logic.openGroupInfoDrawer}
          onOpenWallpaper={logic.openWallpaperModal}
        />
      </ChatHeader>

      {/* 2. In-Chat Search Bar */}
      {logic.isSearchInChatOpen && (
        <div className="bg-[#FAF7F8] border-b border-[#E8E2E5] px-4 py-2 flex items-center justify-between gap-3 z-20 shadow-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={logic.inChatSearchQuery}
              onChange={(e) => {
                logic.setInChatSearchQuery(e.target.value);
                logic.setCurrentSearchIndex(0);
              }}
              placeholder="Search in chat..."
              autoFocus
              className="w-full bg-white border border-[#D5CED2] rounded-xl px-3 py-1.5 text-sm font-cute text-[#1F1E1B] placeholder:text-black/40 focus:outline-none focus:border-[#F09DAF]"
            />
            {logic.matchedMessageIndices.length > 0 && (
              <span className="text-xs font-cute text-black/60 font-medium whitespace-nowrap">
                {logic.currentSearchIndex + 1} of {logic.matchedMessageIndices.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={logic.matchedMessageIndices.length === 0}
              onClick={() => {
                logic.setCurrentSearchIndex((prev) =>
                  prev > 0 ? prev - 1 : logic.matchedMessageIndices.length - 1
                );
              }}
              className="p-1 rounded-lg text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-30 cursor-pointer"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={logic.matchedMessageIndices.length === 0}
              onClick={() => {
                logic.setCurrentSearchIndex((prev) =>
                  prev < logic.matchedMessageIndices.length - 1 ? prev + 1 : 0
                );
              }}
              className="p-1 rounded-lg text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-30 cursor-pointer"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                logic.setSearchInChatOpen(false);
                logic.setInChatSearchQuery('');
              }}
              className="p-1 rounded-lg text-black/60 hover:text-black hover:bg-black/5 cursor-pointer ml-1"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Message List Viewport */}
      <MessageList
        messages={logic.activeMessages}
        conversationId={logic.activeConversation?._id}
        currentUserId={logic.user?._id}
        isDirectChat={isDirect}
        recipient={logic.recipient}
        onStartChatGreeting={() => logic.sendChatMessage('Hi! 👋')}
        selectedMessageIds={logic.selectedMessageIds}
        isSelectMode={logic.isSelectMode}
        onToggleSelect={logic.toggleSelectMessage}
        onReply={(msg) => logic.setReplyingTo(msg)}
        onReact={logic.toggleReaction}
        onOpenReactionsModal={(msgId, emoji) => {
          logic.setReactionsModalMessageId(msgId);
          logic.setReactionsModalInitialEmoji(emoji || null);
        }}
        onOpenReactionPicker={(msgId) => {
          logic.setReactionPickerMessageId((prev) => (prev === msgId ? null : msgId));
        }}
        reactionPickerMessageId={logic.reactionPickerMessageId}
        onPollVote={logic.handlePollVote}
        onMediaClick={(media) => logic.setLightboxMedia(media)}
        matchedMessageIndices={logic.matchedMessageIndices}
        currentSearchIndex={logic.currentSearchIndex}
        messagesEndRef={logic.messagesEndRef}
        disappearingTimer={
          logic.disappearingTimers[logic.activeConversation._id] ||
          logic.activeConversation.disappearingTimer ||
          'off'
        }
        onOpenDisappearingModal={() => logic.setIsDisappearingModalOpen(true)}
      />

      {/* 4. Bottom Composer Input Bar */}
      <ChatComposer
        composerText={logic.composerText}
        onComposerChange={logic.handleComposerChange}
        onSendMessage={logic.handleSendMessage}
        isSending={logic.isSending}
        replyingTo={logic.replyingTo}
        onClearReply={() => logic.setReplyingTo(null)}
        pendingAttachments={logic.pendingAttachments}
        onRemoveAttachment={logic.removePendingAttachment}
        isUploadingAttachment={logic.isUploadingAttachment}
        uploadProgress={logic.uploadProgress}
        isRecordingAudio={logic.isRecordingAudio}
        formattedAudioTimer={logic.formattedAudioTimer}
        onStartAudioRecording={logic.startAudioRecording}
        onStopAudioRecording={() => logic.stopAudioRecording(true)}
        onCancelAudioRecording={logic.cancelAudioRecording}
        onOpenCamera={() => logic.setIsCameraModalOpen(true)}
        isAttachmentMenuOpen={logic.isAttachmentMenuOpen}
        setIsAttachmentMenuOpen={logic.setIsAttachmentMenuOpen}
        attachmentButtonRef={logic.attachmentButtonRef}
        showEmojiPicker={logic.showEmojiPicker}
        setShowEmojiPicker={logic.setShowEmojiPicker}
        composerInputRef={logic.composerInputRef}
        onTriggerFileInput={(type) => {
          if (type === 'document') logic.documentInputRef.current?.click();
          if (type === 'media') logic.mediaInputRef.current?.click();
          if (type === 'audio') logic.audioInputRef.current?.click();
        }}
        onOpenPollModal={() => logic.setIsPollModalOpen(true)}
        onOpenContactModal={() => logic.setIsContactModalOpen(true)}
        onOpenStickerModal={() => logic.setIsStickerModalOpen(true)}
        onSendSticker={async (stickerUrl: string) => {
          const payload = JSON.stringify({
            _type: 'sticker',
            url: stickerUrl,
            name: 'Sticker',
          });
          await logic.sendChatMessage(payload);
        }}
        onSendGif={async (gifUrl: string) => {
          const payload = JSON.stringify({
            _type: 'gif',
            url: gifUrl,
            name: 'GIF',
          });
          await logic.sendChatMessage(payload);
        }}
        isAuthenticated={logic.isAuthenticated}
        hasActiveConversation={Boolean(logic.activeConversation)}
      />



      {/* Disappearing Messages Modal */}
      <DisappearingMessagesModal
        isOpen={logic.isDisappearingModalOpen}
        onClose={() => logic.setIsDisappearingModalOpen(false)}
        disappearingTimer={logic.disappearingTimers[logic.activeConversation._id] || 'off'}
        onSetDisappearingTimer={logic.handleSetDisappearingTimer}
      />

      {/* Audio / Video Calling Modal */}
      <CallModal
        isOpen={logic.isCallModalOpen}
        onClose={() => logic.setIsCallModalOpen(false)}
        callType={logic.activeCallType}
        isIncoming={logic.isIncomingCall}
        partner={logic.callPartner || { id: '', name: 'Call', isGroup: false }}
        callId={logic.activeCallId || undefined}
        conversationId={logic.activeCallConversationId || logic.activeConversation._id}
        onCallEnded={logic.handleCallEnded}
      />

      {/* Reactions Detail Modal */}
      <ReactionsModal
        isOpen={Boolean(logic.reactionsModalMessageId)}
        onClose={() => {
          logic.setReactionsModalMessageId(null);
          logic.setReactionsModalInitialEmoji(null);
        }}
        message={logic.reactionsModalMessage}
        activeConversation={logic.activeConversation}
        currentUser={logic.user}
        initialEmoji={logic.reactionsModalInitialEmoji}
        onRemoveReaction={logic.toggleReaction}
      />

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={logic.isCameraModalOpen}
        onClose={() => logic.setIsCameraModalOpen(false)}
        onCapture={async (file: File, caption?: string, sendImmediately?: boolean) => {
          if (sendImmediately) {
            await logic.sendDirectMedia(file, caption);
          } else {
            if (caption) {
              logic.setComposerText((prev) => (prev.trim() ? `${prev.trim()} ${caption}` : caption));
            }
            await logic.uploadFiles([file]);
            setTimeout(() => {
              logic.composerInputRef.current?.focus();
            }, 50);
          }
        }}
      />

      {/* Contact Sharing Modal */}
      <ContactModal
        isOpen={logic.isContactModalOpen}
        onClose={() => logic.setIsContactModalOpen(false)}
        onSendContact={async (contact: ContactData) => {
          const payload = JSON.stringify(contact);
          await logic.sendChatMessage(payload);
        }}
      />

      {/* Poll Creation Modal */}
      <PollModal
        isOpen={logic.isPollModalOpen}
        onClose={() => logic.setIsPollModalOpen(false)}
        onSendPoll={async (poll: PollData) => {
          const payload = JSON.stringify(poll);
          await logic.sendChatMessage(payload);
        }}
      />

      {/* Sticker Picker Modal */}
      <StickerModal
        isOpen={logic.isStickerModalOpen}
        onClose={() => logic.setIsStickerModalOpen(false)}
        onSendSticker={async (sticker: StickerData) => {
          const payload = JSON.stringify(sticker);
          await logic.sendChatMessage(payload);
        }}
        onUploadStickerFile={async (file: File) => {
          try {
            const res = await apiService.uploadSingle(file);
            if (res.success && res.attachment) {
              return getMediaUrl(res.attachment.url);
            }
          } catch (err) {
            console.error('Failed to upload sticker file:', err);
          }
          return null;
        }}
      />

      {/* Media Lightbox Viewer */}
      {logic.lightboxMedia && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
          onClick={() => logic.setLightboxMedia(null)}
        >
          <button
            type="button"
            onClick={() => logic.setLightboxMedia(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {logic.lightboxMedia.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logic.lightboxMedia.url}
                alt={logic.lightboxMedia.title}
                className="w-full h-full object-contain max-h-[85vh]"
              />
            ) : (
              <video src={logic.lightboxMedia.url} controls autoPlay className="w-full h-full max-h-[85vh]" />
            )}
          </div>
        </div>
      )}

      {/* Delete Messages Confirmation Modal */}
      {logic.isDeleteModalOpen && (() => {
        const canDeleteForEveryone =
          logic.messagesToDelete.length > 0 &&
          logic.messagesToDelete.every((msgId) => {
            const msg = logic.activeMessages.find((m) => m._id === msgId);
            if (!msg) return false;
            const sender = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            return sender === logic.user?._id;
          });

        return (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
            onClick={() => logic.setIsDeleteModalOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-[#FFF5F7] rounded-3xl p-6 shadow-2xl border border-[#F5BAC6] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-handwriting text-2xl font-bold text-[#2D151D]">
                Delete {logic.messagesToDelete.length} message{logic.messagesToDelete.length > 1 ? 's' : ''}?
              </h3>
              <p className="text-xs font-cute text-[#7C5362] mt-2 leading-relaxed">
                {canDeleteForEveryone
                  ? 'You can delete these messages for yourself or for everyone in this chat.'
                  : 'You can delete these messages for yourself in this chat.'}
              </p>
              <div className="flex flex-col gap-2 mt-5">
                {canDeleteForEveryone && (
                  <button
                    type="button"
                    onClick={async () => {
                      await logic.deleteMessages(logic.messagesToDelete, 'everyone');
                      logic.setIsDeleteModalOpen(false);
                      logic.setMessagesToDelete([]);
                      logic.setSelectedMessageIds([]);
                      logic.setIsSelectMode(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-cute text-sm font-semibold transition cursor-pointer shadow-md shadow-[#C24A68]/20"
                  >
                    Delete for everyone
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await logic.deleteMessages(logic.messagesToDelete, 'me');
                    logic.setIsDeleteModalOpen(false);
                    logic.setMessagesToDelete([]);
                    logic.setSelectedMessageIds([]);
                    logic.setIsSelectMode(false);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#F5BAC6] bg-[#FFEBF0] hover:bg-[#FCE7EC] text-[#2D151D] font-cute text-sm font-semibold transition cursor-pointer"
                >
                  Delete for me
                </button>
                <button
                  type="button"
                  onClick={() => logic.setIsDeleteModalOpen(false)}
                  className="w-full py-2 text-center text-xs font-cute text-[#7C5362] hover:text-[#2D151D] transition cursor-pointer mt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
};
