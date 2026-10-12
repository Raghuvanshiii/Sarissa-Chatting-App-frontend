'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoryStore } from '../../store/useStoryStore';
import { getMediaUrl } from '../../utils/media';

function formatStoryTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getNormalizedUrl(rawUrl?: string): string {
  if (!rawUrl) return '#';
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const StoryUploadStudio: React.FC = () => {
  const { user } = useAuthStore();
  const { myStories, storyDraft } = useStoryStore();

  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // If activeStoryIdx exceeds current story count, clamp it
  useEffect(() => {
    if (myStories.length > 0 && activeStoryIdx >= myStories.length) {
      setActiveStoryIdx(0);
    }
  }, [myStories.length, activeStoryIdx]);

  // Is viewing a draft or an existing active story
  const isDraftMode = Boolean(storyDraft);
  const currentActiveStory = !isDraftMode && myStories.length > 0 ? myStories[activeStoryIdx] : null;

  // Active story type & media
  const currentType = isDraftMode
    ? storyDraft?.type || 'image'
    : currentActiveStory?.type || 'image';

  const currentMediaUrl = isDraftMode
    ? storyDraft?.mediaUrl
    : currentActiveStory?.mediaUrl;

  const currentCaption = isDraftMode
    ? storyDraft?.caption || ''
    : currentActiveStory?.caption || '';

  const currentTextContent = isDraftMode
    ? storyDraft?.textContent || ''
    : currentActiveStory?.textContent || '';

  const currentBackground = isDraftMode
    ? storyDraft?.textStyle?.background || 'linear-gradient(135deg, #E05375 0%, #741E34 100%)'
    : currentActiveStory?.textStyle?.background || '#181816';

  const currentLinkUrl = isDraftMode
    ? storyDraft?.linkUrl || ''
    : currentActiveStory?.linkUrl || '';

  const currentLinkTitle = isDraftMode
    ? storyDraft?.linkTitle || ''
    : currentActiveStory?.linkTitle || '';

  // Progress timer for active stories playback
  useEffect(() => {
    if (isDraftMode || !currentActiveStory || !isPlaying) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    const durationSeconds = currentActiveStory.duration || 6;
    const intervalMs = 50;
    const step = (intervalMs / (durationSeconds * 1000)) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          // Advance to next story
          if (activeStoryIdx < myStories.length - 1) {
            setActiveStoryIdx((idx) => idx + 1);
            return 0;
          } else {
            // Loop back to first story
            setActiveStoryIdx(0);
            return 0;
          }
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isDraftMode, currentActiveStory, isPlaying, activeStoryIdx, myStories.length]);

  // Reset progress on active story switch
  useEffect(() => {
    setProgress(0);
  }, [activeStoryIdx]);

  // Handle video playback synchronization
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, currentMediaUrl]);

  const handlePrevStory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (myStories.length <= 1) return;
    setProgress(0);
    setActiveStoryIdx((prev) => (prev > 0 ? prev - 1 : myStories.length - 1));
  };

  const handleNextStory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (myStories.length <= 1) return;
    setProgress(0);
    setActiveStoryIdx((prev) => (prev < myStories.length - 1 ? prev + 1 : 0));
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying((prev) => !prev);
  };

  return (
    <main className="relative flex-1 h-screen flex flex-col bg-[#FFF5F7] select-none overflow-y-auto font-cute text-[#2D151D]">

      {/* Main Studio Body: Centered Interactive Live Phone Preview Mockup */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 w-full max-w-xl mx-auto my-auto">
        
        {/* Phone Mockup Header Label */}
        <div className="mb-3 text-center flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
            Live Story Preview
          </span>
          {isDraftMode && (
            <span className="px-2 py-0.5 rounded-full bg-[#E05375] text-white text-[11px] font-bold shadow-2xs">
              Draft
            </span>
          )}
        </div>

        {/* Smartphone Frame Container */}
        <div className="w-full max-w-[320px] aspect-[9/16] bg-zinc-950 rounded-[44px] p-3 shadow-2xl ring-1 ring-zinc-800/80 relative flex flex-col overflow-hidden">
          
          {/* Top Phone Speaker Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-900 rounded-full z-30" />

          {/* Story Screen Canvas */}
          <div
            style={{
              background:
                currentType === 'text'
                  ? currentBackground
                  : currentType === 'link'
                  ? 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)'
                  : '#000000',
            }}
            className="w-full h-full rounded-[34px] overflow-hidden relative flex flex-col justify-between p-4 z-20 text-white select-none"
          >
            
            {/* 1. Story Header (Progress Bar + Author Profile + Controls) */}
            <div className="relative z-30 pt-3">
              {/* Segmented Progress Bar */}
              <div className="w-full flex items-center gap-1.5 mb-2.5">
                {isDraftMode ? (
                  <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-white rounded-full animate-pulse" />
                  </div>
                ) : myStories.length > 0 ? (
                  myStories.map((s, idx) => {
                    let seg = 0;
                    if (idx < activeStoryIdx) seg = 100;
                    else if (idx === activeStoryIdx) seg = progress;

                    return (
                      <div
                        key={s._id}
                        className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-white transition-all duration-75"
                          style={{ width: `${seg}%` }}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-white/40 rounded-full" />
                  </div>
                )}
              </div>

              {/* Author Info & Play/Pause */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full ring-2 ring-white/50 overflow-hidden bg-white/20 flex-shrink-0">
                    {user?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(user.avatar)}
                        alt={user.fullName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E05375] text-white text-xs font-bold flex items-center justify-center font-cute">
                        {(user?.fullName || 'ME').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate drop-shadow-md leading-tight">
                      {user?.fullName || user?.username || 'You'}
                    </p>
                    <p className="text-[11px] text-white/80 drop-shadow-md leading-tight mt-0.5">
                      {isDraftMode
                        ? 'Draft preview'
                        : currentActiveStory
                        ? formatStoryTime(currentActiveStory.createdAt)
                        : 'No stories yet'}
                    </p>
                  </div>
                </div>

                {/* Inline playback controls on phone preview */}
                {!isDraftMode && myStories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
                      title={isPlaying ? 'Pause preview' : 'Resume preview'}
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>

                    {currentType === 'video' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMuted((prev) => !prev);
                        }}
                        className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
                        title={isMuted ? 'Unmute video' : 'Mute video'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Main Story Visual Content */}
            <div className="flex-1 flex items-center justify-center my-auto p-2 overflow-hidden relative">
              {/* Photo Story */}
              {currentType === 'image' && currentMediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(currentMediaUrl)}
                  alt="Story Preview"
                  className="max-h-full max-w-full object-contain rounded-xl drop-shadow-lg"
                />
              )}

              {/* Video Story */}
              {currentType === 'video' && currentMediaUrl && (
                <video
                  ref={videoRef}
                  src={getMediaUrl(currentMediaUrl)}
                  autoPlay
                  playsInline
                  loop
                  muted={isMuted}
                  className="max-h-full max-w-full object-contain rounded-xl drop-shadow-lg"
                />
              )}

              {/* Empty Photo / Video waiting placeholder */}
              {(currentType === 'image' || currentType === 'video') && !currentMediaUrl && (
                <div className="text-center p-6 text-white/60 font-cute text-xs space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <ImageIcon className="w-6 h-6 text-white/70" />
                  </div>
                  <p className="font-bold text-white text-sm">
                    {isDraftMode ? `Choose a ${currentType}` : 'No active story'}
                  </p>
                  <p className="text-[12px] text-white/60 max-w-[200px]">
                    {isDraftMode
                      ? 'Upload media in the left sidebar to see the live preview.'
                      : 'Share a story from the left sidebar to preview it live here.'}
                  </p>
                </div>
              )}

              {/* Text Story */}
              {currentType === 'text' && (
                <div className="w-full px-3 text-center">
                  <p className="text-base sm:text-lg font-bold leading-relaxed break-words text-white drop-shadow-md">
                    {currentTextContent.trim() ||
                      (isDraftMode
                        ? 'Type your story text in the sidebar...'
                        : 'No text content available.')}
                  </p>
                </div>
              )}

              {/* Link Story */}
              {currentType === 'link' && (
                <div className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center space-y-2.5 drop-shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-white truncate">
                    {currentLinkTitle.trim() || 'Link Story Preview'}
                  </h4>
                  <p className="text-[12px] text-white/70 truncate underline">
                    {currentLinkUrl.trim() || 'https://example.com'}
                  </p>
                  {currentLinkUrl && (
                    <a
                      href={getNormalizedUrl(currentLinkUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block mt-1 py-1.5 px-3 rounded-lg bg-[#E05375] hover:bg-[#D43D61] text-white text-[12px] font-bold"
                    >
                      Visit Website
                    </a>
                  )}
                </div>
              )}

              {/* Left / Right interactive click zones for multi-story switching */}
              {!isDraftMode && myStories.length > 1 && (
                <>
                  <div
                    onClick={handlePrevStory}
                    className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-20"
                    title="Previous story"
                  />
                  <div
                    onClick={handleNextStory}
                    className="absolute inset-y-0 right-0 w-2/3 cursor-pointer z-20"
                    title="Next story"
                  />
                </>
              )}
            </div>

            {/* 3. Bottom Caption Overlay */}
            {currentCaption && (
              <div className="relative z-30 mb-2">
                <div className="px-3.5 py-2 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs text-center border border-white/15 drop-shadow-md line-clamp-2">
                  {currentCaption}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom External Controls (When user has multiple active stories) */}
        {!isDraftMode && myStories.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#F7CAD0] shadow-xs">
            <button
              type="button"
              onClick={handlePrevStory}
              disabled={myStories.length <= 1}
              className="p-1.5 rounded-full hover:bg-[#FFF0F3] text-[#741E34] transition cursor-pointer disabled:opacity-40"
              title="Previous story"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-[#741E34] px-1 font-mono">
              {activeStoryIdx + 1} / {myStories.length}
            </span>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-1.5 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white transition cursor-pointer shadow-2xs"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.2" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNextStory}
              disabled={myStories.length <= 1}
              className="p-1.5 rounded-full hover:bg-[#FFF0F3] text-[#741E34] transition cursor-pointer disabled:opacity-40"
              title="Next story"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </main>
  );
};
