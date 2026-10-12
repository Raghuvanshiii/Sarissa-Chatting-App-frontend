'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Trash2, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play,
  Share2,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoryStore } from '../../store/useStoryStore';
import { StoryViewersModal } from './StoryViewersModal';
import { Story } from '../../types/story';
import { getMediaUrl } from '../../utils/media';

function formatStoryTime(dateString?: string): string {
  if (!dateString) return '';
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

export const StoryViewerModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    myStories,
    otherStories,
    activeGroupIndex,
    activeStoryIndex,
    isStoryViewerOpen,
    isViewersDrawerOpen,
    activeStoryViewers,
    isLoadingViewers,
    closeStoryViewer,
    nextStory,
    prevStory,
    deleteStory,
    markStoryViewed,
    fetchStoryViewers,
    openViewersDrawer,
    closeViewersDrawer,
  } = useStoryStore();

  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyPausedRef = useRef(false);
  const progressRef = useRef(0);
  const pressStartTimeRef = useRef(0);
  const viewedStoryIdsRef = useRef<Set<string>>(new Set());

  // Determine current active group of stories
  const isMyStoryGroup = activeGroupIndex === -1;
  const currentStories: Story[] = isMyStoryGroup
    ? myStories
    : (activeGroupIndex !== null && otherStories[activeGroupIndex] ? otherStories[activeGroupIndex].stories : []);

  const currentStory: Story | undefined = currentStories[activeStoryIndex];
  const storyAuthor = isMyStoryGroup
    ? (user || (typeof currentStory?.author === 'object' ? currentStory.author : undefined))
    : (activeGroupIndex !== null && otherStories[activeGroupIndex] ? otherStories[activeGroupIndex].user : undefined);

  // Reset progress and pause state ONLY when switching stories
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    setIsPaused(false);
    isManuallyPausedRef.current = false;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [currentStory?._id]);

  // Mark viewed if viewer is not the author (guarded by session ref to prevent duplicate dispatches)
  useEffect(() => {
    if (!isStoryViewerOpen || !currentStory || !user || !currentStory.author) return;
    const authorId = typeof currentStory.author === 'object' ? currentStory.author._id : currentStory.author;
    const sId = String(currentStory._id);
    if (String(authorId) !== String(user._id)) {
      if (!viewedStoryIdsRef.current.has(sId)) {
        viewedStoryIdsRef.current.add(sId);
        markStoryViewed(sId);
      }
    }
  }, [isStoryViewerOpen, currentStory?._id, user?._id, markStoryViewed]);

  // Synchronize HTML5 video element with pause state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused || isViewersDrawerOpen || showDeleteConfirm) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, isViewersDrawerOpen, showDeleteConfirm]);

  // Handle Progress Timer (Resumes smoothly from current progress point)
  useEffect(() => {
    if (!isStoryViewerOpen || !currentStory || isPaused || isViewersDrawerOpen || showDeleteConfirm) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    const durationSeconds = currentStory.duration || 6;
    const intervalMs = 50;
    const step = (intervalMs / (durationSeconds * 1000)) * 100;

    progressTimerRef.current = setInterval(() => {
      const nextProgress = progressRef.current + step;
      if (nextProgress >= 100) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        progressRef.current = 0;
        setProgress(100);
        nextStory();
      } else {
        progressRef.current = nextProgress;
        setProgress(nextProgress);
      }
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isStoryViewerOpen, currentStory, isPaused, isViewersDrawerOpen, showDeleteConfirm, nextStory]);

  // Global keyboard navigation
  useEffect(() => {
    if (!isStoryViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isViewersDrawerOpen) {
          handleCloseViewers();
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
          setIsPaused(false);
        } else {
          closeStoryViewer();
        }
      } else if (e.key === 'ArrowRight') {
        if (!isViewersDrawerOpen && !showDeleteConfirm) nextStory();
      } else if (e.key === 'ArrowLeft') {
        if (!isViewersDrawerOpen && !showDeleteConfirm) prevStory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStoryViewerOpen, isViewersDrawerOpen, showDeleteConfirm, nextStory, prevStory, closeStoryViewer]);

  // Reset progress and states when closed
  useEffect(() => {
    if (!isStoryViewerOpen) {
      progressRef.current = 0;
      setIsPaused(false);
      isManuallyPausedRef.current = false;
      setShowDeleteConfirm(false);
      setProgress(0);
    }
  }, [isStoryViewerOpen]);

  // Early return if modal is closed or missing data
  if (!isStoryViewerOpen || activeGroupIndex === null || !currentStory || !storyAuthor) {
    return null;
  }

  const isAuthor = Boolean(
    isMyStoryGroup ||
    (user?._id && currentStory?.author && (
      typeof currentStory.author === 'object'
        ? String(currentStory.author._id) === String(user._id)
        : String(currentStory.author) === String(user._id)
    ))
  );

  const uniqueViewerIds = new Set<string>();
  for (const v of currentStory.viewers || []) {
    const uid = typeof v.user === 'object' && v.user ? String(v.user._id) : (v.user ? String(v.user) : null);
    if (uid) uniqueViewerIds.add(uid);
  }
  const uniqueViewerCount = uniqueViewerIds.size;

  const hasCaption = Boolean(currentStory.caption?.trim());
  const isLongCaption = (currentStory.caption?.trim().length || 0) > 60;
  const mediaPaddingClass = hasCaption
    ? isLongCaption
      ? 'pt-20 pb-36 px-3'
      : 'pt-20 pb-28 px-3'
    : 'pt-16 pb-16 px-1';

  const handleDelete = async () => {
    if (!currentStory || isDeleting) return;
    try {
      setIsDeleting(true);
      const res = await deleteStory(currentStory._id);
      if (!res.success) {
        console.error('Failed to delete story:', res.error);
      }
    } catch (err) {
      console.error('Error during story deletion:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenViewers = () => {
    setIsPaused(true);
    // If current story already has viewers in memory, seed activeStoryViewers immediately
    if (currentStory?.viewers && currentStory.viewers.length > 0) {
      useStoryStore.setState({ activeStoryViewers: currentStory.viewers });
    }
    fetchStoryViewers(currentStory._id);
    openViewersDrawer();
  };

  const handleCloseViewers = () => {
    closeViewersDrawer();
    setIsPaused(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in duration-200"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') nextStory();
        if (e.key === 'ArrowLeft') prevStory();
        if (e.key === 'Escape') closeStoryViewer();
      }}
      tabIndex={0}
    >
      {/* Desktop Chevron: Previous */}
      <button
        type="button"
        onClick={prevStory}
        title="Previous Story"
        className="hidden md:flex absolute left-4 lg:left-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Main Story Container (Phone / Vertical Aspect Ratio Box) */}
      <div 
        className="relative w-full max-w-[420px] h-full sm:h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col bg-zinc-950 shadow-2xl border border-white/10"
      >
        {/* Top Progress Bars (Segmented by number of stories in group) */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 pt-3 space-y-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1.5 w-full">
            {currentStories.map((s, idx) => {
              let segmentProgress = 0;
              if (idx < activeStoryIndex) segmentProgress = 100;
              else if (idx === activeStoryIndex) segmentProgress = progress;

              return (
                <div
                  key={s._id}
                  className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{ width: `${segmentProgress}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Story Author Header */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden ring-1.5 ring-white shrink-0">
                {storyAuthor.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getMediaUrl(storyAuthor.avatar)}
                    alt={storyAuthor.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#C24A68] to-[#E07A93] text-white text-xs font-bold flex items-center justify-center">
                    {storyAuthor.fullName ? storyAuthor.fullName.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                  {storyAuthor.fullName}
                </p>
                <p className="text-[11px] text-white/70 font-mono flex items-center gap-1 leading-tight mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatStoryTime(currentStory.createdAt)}</span>
                </p>
              </div>
            </div>

            {/* Top Actions: Play/Pause, Delete (if author), Close */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused((prev) => {
                    const next = !prev;
                    isManuallyPausedRef.current = next;
                    return next;
                  });
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/90 transition cursor-pointer"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              {isAuthor && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(true);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1.5 rounded-full hover:bg-rose-500/30 text-rose-300 transition cursor-pointer"
                  title="Delete this story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={closeStoryViewer}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/90 transition cursor-pointer"
                title="Close viewer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Canvas / Media Area */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
          {/* 1. IMAGE STORY */}
          {currentStory.type === 'image' && currentStory.mediaUrl && (
            <div className={`w-full h-full flex items-center justify-center transition-all duration-150 ${mediaPaddingClass}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(currentStory.mediaUrl)}
                alt="Story"
                className="max-w-full max-h-full object-contain pointer-events-none select-none rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* 2. VIDEO STORY */}
          {currentStory.type === 'video' && currentStory.mediaUrl && (
            <div className={`relative w-full h-full flex items-center justify-center transition-all duration-150 ${mediaPaddingClass}`}>
              <video
                ref={videoRef}
                src={getMediaUrl(currentStory.mediaUrl)}
                autoPlay
                playsInline
                muted={isMuted}
                loop
                className="max-w-full max-h-full object-contain rounded-2xl shadow-lg"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="absolute top-22 right-5 p-2 rounded-full bg-black/60 text-white backdrop-blur-md transition cursor-pointer z-20 hover:bg-black/80"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* 3. TEXT STORY */}
          {currentStory.type === 'text' && (
            <div
              className="w-full h-full p-8 flex flex-col items-center justify-center text-center text-white select-text"
              style={{
                background: currentStory.textStyle?.background || '#181816',
                fontFamily: currentStory.textStyle?.fontFamily === 'serif' ? 'serif' : currentStory.textStyle?.fontFamily === 'mono' ? 'monospace' : 'sans-serif',
              }}
            >
              <p
                className={`max-w-[340px] font-medium leading-relaxed drop-shadow-md ${
                  (currentStory.textContent?.length || 0) < 60
                    ? 'text-xl sm:text-2xl'
                    : 'text-base sm:text-lg'
                }`}
              >
                {currentStory.textContent}
              </p>
            </div>
          )}

          {/* 4. LINK STORY */}
          {currentStory.type === 'link' && (
            <div className="relative w-full h-full p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#2D151D] via-[#1D0C12] to-[#12050A] text-white">
              <div 
                className="relative z-20 w-full max-w-xs p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-3 cursor-pointer hover:bg-white/15 hover:border-white/30 transition group select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetUrl = getNormalizedUrl(currentStory.linkUrl);
                  if (targetUrl && targetUrl !== '#') {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-rose-300 shadow-inner group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold leading-snug group-hover:text-rose-200 transition-colors">
                  {currentStory.linkTitle || 'Explore Link'}
                </h4>
                <p className="text-xs text-white/70 line-clamp-2 break-all font-mono">
                  {currentStory.linkUrl}
                </p>
                <a
                  href={getNormalizedUrl(currentStory.linkUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-semibold text-xs active:scale-[0.98] transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline"
                >
                  <span>Open Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Dedicated Caption Area (Rendered in dedicated space below image, above views pill) */}
          {hasCaption && (
            <div className="absolute bottom-13 sm:bottom-14 inset-x-0 px-4 flex justify-center z-20 pointer-events-none">
              <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-white text-xs sm:text-sm font-medium max-w-[90%] text-center border border-white/15 shadow-2xl leading-relaxed select-text">
                {currentStory.caption}
              </div>
            </div>
          )}

          {/* Invisible Left & Right Click Zones for Navigation */}
          <div
            onClick={() => {
              const elapsed = Date.now() - pressStartTimeRef.current;
              if (elapsed < 280) {
                prevStory();
              }
            }}
            onMouseDown={() => {
              pressStartTimeRef.current = Date.now();
              if (!isManuallyPausedRef.current) setIsPaused(true);
            }}
            onMouseUp={() => {
              if (!isManuallyPausedRef.current) setIsPaused(false);
            }}
            onTouchStart={() => {
              pressStartTimeRef.current = Date.now();
              if (!isManuallyPausedRef.current) setIsPaused(true);
            }}
            onTouchEnd={() => {
              if (!isManuallyPausedRef.current) setIsPaused(false);
            }}
            className="absolute left-0 top-0 bottom-0 w-[35%] z-10 cursor-pointer"
            title="Tap left to go back"
          />
          <div
            onClick={() => {
              const elapsed = Date.now() - pressStartTimeRef.current;
              if (elapsed < 280) {
                nextStory();
              }
            }}
            onMouseDown={() => {
              pressStartTimeRef.current = Date.now();
              if (!isManuallyPausedRef.current) setIsPaused(true);
            }}
            onMouseUp={() => {
              if (!isManuallyPausedRef.current) setIsPaused(false);
            }}
            onTouchStart={() => {
              pressStartTimeRef.current = Date.now();
              if (!isManuallyPausedRef.current) setIsPaused(true);
            }}
            onTouchEnd={() => {
              if (!isManuallyPausedRef.current) setIsPaused(false);
            }}
            className="absolute right-0 top-0 bottom-0 w-[65%] z-10 cursor-pointer"
            title="Tap right to advance"
          />
        </div>

        {/* Bottom Bar: For Author (Viewers Count) */}
        {isAuthor && (
          <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-start text-white pointer-events-none">
            <button
              type="button"
              onClick={handleOpenViewers}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md transition cursor-pointer text-xs font-semibold pointer-events-auto"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{uniqueViewerCount} {uniqueViewerCount === 1 ? 'view' : 'views'}</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Popup */}
        {showDeleteConfirm && (
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-[#1F1F1D] border border-white/10 rounded-3xl p-5 text-center text-white space-y-3.5 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-900/60 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Delete this story?</h4>
                <p className="text-xs text-white/70 mt-1">
                  This action cannot be undone. It will be removed immediately for all viewers.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    setIsPaused(false);
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Chevron: Next */}
      <button
        type="button"
        onClick={nextStory}
        title="Next Story"
        className="hidden md:flex absolute right-4 lg:right-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Viewers Drawer / Modal */}
      <StoryViewersModal
        isOpen={isViewersDrawerOpen}
        onClose={handleCloseViewers}
        viewers={
          activeStoryViewers && activeStoryViewers.length > 0
            ? activeStoryViewers
            : (currentStory?.viewers || [])
        }
        isLoading={isLoadingViewers && (!currentStory?.viewers || currentStory.viewers.length === 0)}
      />
    </div>
  );
};
