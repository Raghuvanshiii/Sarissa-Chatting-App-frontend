'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CircleDot,
  Plus,
  Search,
  X,
  Eye,
  Sparkles,
  Loader2,
  Upload,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoryStore } from '../../store/useStoryStore';
import { apiService } from '../../services/api';
import { StoryType } from '../../types/story';
import { getMediaUrl } from '../../utils/media';
import { MobileNavigation } from '../layout/MobileNavigation';

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

const TEXT_BACKGROUND_PRESETS = [
  { name: 'Sweet Rose', value: 'linear-gradient(135deg, #E05375 0%, #741E34 100%)' },
  { name: 'Rose Twilight', value: 'linear-gradient(135deg, #4C0519 0%, #22030B 100%)' },
  { name: 'Midnight Glow', value: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' },
  { name: 'Forest Dusk', value: 'linear-gradient(135deg, #1B2B20 0%, #0F1712 100%)' },
  { name: 'Warm Amber', value: 'linear-gradient(135deg, #36200A 0%, #1F1306 100%)' },
  { name: 'Lavender Night', value: 'linear-gradient(135deg, #2E1065 0%, #170B2C 100%)' },
];

type StoryFilter = 'all' | 'seen' | 'unseen';

export const StoriesPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    myStories,
    otherStories,
    isLoading,
    fetchStories,
    createStory,
    openStoryViewer,
    setStoryDraft,
  } = useStoryStore();

  const [activeFilter, setActiveFilter] = useState<StoryFilter>('all');
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline upload state for Column 2
  const [uploadType, setUploadType] = useState<StoryType>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState(TEXT_BACKGROUND_PRESETS[0].value);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft story with center Live Story Preview
  useEffect(() => {
    if (isCreateMode) {
      setStoryDraft({
        type: uploadType,
        mediaUrl: mediaPreviewUrl,
        caption: caption.trim() || undefined,
        textContent: textContent.trim() || undefined,
        textStyle: {
          background: selectedBackground,
          textColor: '#FFFFFF',
          fontFamily: 'cute',
          fontSize: textContent.length < 60 ? 'large' : 'medium',
        },
        linkUrl: linkUrl.trim() || undefined,
        linkTitle: linkTitle.trim() || undefined,
      });
    } else {
      setStoryDraft(null);
    }
  }, [
    isCreateMode,
    uploadType,
    mediaPreviewUrl,
    caption,
    textContent,
    selectedBackground,
    linkUrl,
    linkTitle,
    setStoryDraft,
  ]);

  // Clean up draft on unmount
  useEffect(() => {
    return () => {
      setStoryDraft(null);
    };
  }, [setStoryDraft]);

  // Sync stories on mount
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Unseen stories count for badge
  const unseenCount = useMemo(() => {
    return otherStories.filter((g) => g.hasUnviewed).length;
  }, [otherStories]);
  // Filter friends' stories by active filter and search
  const filteredOtherStories = useMemo(() => {
    let list = otherStories;

    if (activeFilter === 'seen') {
      list = list.filter((g) => !g.hasUnviewed);
    } else if (activeFilter === 'unseen') {
      list = list.filter((g) => g.hasUnviewed);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((group) => {
        const name = group.user?.fullName || group.user?.username || '';
        return name.toLowerCase().includes(q);
      });
    }

    return list;
  }, [otherStories, activeFilter, searchQuery]);

  // Search placeholder dynamically tailored to active filter
  const searchPlaceholder = useMemo(() => {
    if (activeFilter === 'seen') return 'Search seen stories...';
    if (activeFilter === 'unseen') return 'Search unseen stories...';
    return 'Search stories & updates...';
  }, [activeFilter]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size cannot exceed 50MB.');
      return;
    }

    if (file.type.startsWith('video/')) {
      setUploadType('video');
    } else if (file.type.startsWith('image/')) {
      setUploadType('image');
    }

    setSelectedFile(file);
    setUploadError(null);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setMediaPreviewUrl(null);
    setCaption('');
    setTextContent('');
    setLinkUrl('');
    setLinkTitle('');
    setUploadError(null);
    setIsSubmitting(false);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    // Authority check
    if (!user) {
      setUploadError('You must be logged in to create a story.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (uploadType === 'image' || uploadType === 'video') {
        if (!selectedFile) {
          setUploadError(`Please choose a ${uploadType} file.`);
          setIsSubmitting(false);
          return;
        }

        const uploadRes = await apiService.uploadSingle(selectedFile);
        if (!uploadRes.success || !uploadRes.attachment) {
          setUploadError('Failed to upload file.');
          setIsSubmitting(false);
          return;
        }

        const res = await createStory({
          type: uploadType,
          mediaUrl: uploadRes.attachment.url,
          caption: caption.trim(),
          duration: uploadType === 'video' ? 15 : 6,
        });

        if (res.success) {
          resetUploadForm();
          setIsCreateMode(false);
          setActiveFilter('all');
        } else {
          setUploadError(res.error || 'Failed to create story.');
        }
      } else if (uploadType === 'text') {
        if (!textContent.trim()) {
          setUploadError('Please type your story text.');
          setIsSubmitting(false);
          return;
        }

        const res = await createStory({
          type: 'text',
          textContent: textContent.trim(),
          textStyle: {
            background: selectedBackground,
            textColor: '#FFFFFF',
            fontFamily: 'Quicksand, sans-serif',
            fontSize: textContent.length < 60 ? 'large' : 'medium',
          },
          duration: 6,
        });

        if (res.success) {
          resetUploadForm();
          setIsCreateMode(false);
          setActiveFilter('all');
        } else {
          setUploadError(res.error || 'Failed to create text story.');
        }
      } else if (uploadType === 'link') {
        if (!linkUrl.trim()) {
          setUploadError('Please provide a link URL.');
          setIsSubmitting(false);
          return;
        }

        let formattedUrl = linkUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }

        const res = await createStory({
          type: 'link',
          linkUrl: formattedUrl,
          linkTitle: linkTitle.trim() || 'Tap to visit link',
          caption: caption.trim(),
          duration: 6,
        });

        if (res.success) {
          resetUploadForm();
          setIsCreateMode(false);
          setActiveFilter('all');
        } else {
          setUploadError(res.error || 'Failed to create link story.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-full h-full bg-[#FFF0F3] border-r border-[#F7CAD0] flex flex-col z-10 flex-shrink-0 select-none overflow-hidden font-cute">

      {/* 1. Header Bar ("Story" Title + Quick Action) */}
      <header className="px-4.5 pt-4.5 pb-2 flex items-center justify-between flex-shrink-0">
        <h1 className="font-cute text-2xl lg:text-[27px] font-bold text-[#2D151D] tracking-tight">
          Story
        </h1>

        <button
          type="button"
          onClick={() => setIsCreateMode(!isCreateMode)}
          className="px-3 py-1.5 rounded-full bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
          title={isCreateMode ? 'View stories' : 'Add a new story'}
        >
          {isCreateMode ? (
            <span>View Stories</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
              <span>Add Story</span>
            </>
          )}
        </button>
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

      {/* 3. Filter Tabs Bar: All, Seen, Unseen */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-cute text-xs flex-shrink-0">
        {/* All Tab */}
        <button
          type="button"
          onClick={() => { setActiveFilter('all'); setIsCreateMode(false); }}
          className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap ${activeFilter === 'all' && !isCreateMode
            ? 'bg-[#E05375] text-white font-bold shadow-2xs'
            : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
            }`}
        >
          <span>All</span>
        </button>

        {/* Seen Tab */}
        <button
          type="button"
          onClick={() => { setActiveFilter('seen'); setIsCreateMode(false); }}
          className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap ${activeFilter === 'seen' && !isCreateMode
            ? 'bg-[#E05375] text-white font-bold shadow-2xs'
            : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
            }`}
        >
          <span>Seen</span>
        </button>

        {/* Unseen Tab */}
        <button
          type="button"
          onClick={() => { setActiveFilter('unseen'); setIsCreateMode(false); }}
          className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${activeFilter === 'unseen' && !isCreateMode
            ? 'bg-[#E05375] text-white font-bold shadow-2xs'
            : 'bg-[#FCD8E0] text-[#7D2338] hover:bg-[#FCD2DC] font-semibold'
            }`}
        >
          <span>Unseen</span>
          {unseenCount > 0 && (
            <span
              className={`px-1.5 min-w-[18px] h-4.5 rounded-full text-[11px] font-bold font-sans flex items-center justify-center leading-none ${activeFilter === 'unseen' && !isCreateMode
                ? 'bg-white text-[#E05375]'
                : 'bg-[#E05375] text-white'
                }`}
            >
              {unseenCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">

        {/* --- VIEW UPDATES MODE (Default) --- */}
        {!isCreateMode && (
          <div className="space-y-3">

            {/* Section A: My Story (Current User - Only shown on 'all' filter) */}
            {activeFilter === 'all' && (
              <div>
                <div className="px-2.5 pt-1 pb-1.5 text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
                  My Status
                </div>

                {myStories.length === 0 ? (
                  /* No active stories: Prompt to add */
                  <div
                    onClick={() => setIsCreateMode(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#FCEAEF] transition duration-150 cursor-pointer group"
                  >
                    <div className="relative flex-shrink-0">
                      {user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(user.avatar)}
                          alt={user.fullName || 'User'}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-dashed ring-[#E05375] p-0.5"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#FCE7EC] text-[#C24A68] text-base font-bold flex items-center justify-center font-cute ring-2 ring-dashed ring-[#E05375]">
                          {(user?.fullName || 'ME').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#E05375] text-white shadow-2xs flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight">
                        My Story
                      </h3>
                      <p className="text-xs font-cute text-[#7C5362] truncate mt-0.5">
                        Tap to share a photo, video or text
                      </p>
                    </div>
                  </div>
                ) : (
                  /* User has active stories */
                  <div className="space-y-1">
                    {/* Card to View All My Stories */}
                    <div
                      onClick={() => openStoryViewer(-1, 0)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#FFF9FA] hover:bg-[#FCEAEF] border border-[#F5CAD3] transition duration-150 cursor-pointer group shadow-2xs"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#E05375] to-[#741E34]">
                          {user?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMediaUrl(user.avatar)}
                              alt={user.fullName || 'User'}
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-white"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#FCE7EC] text-[#C24A68] text-sm font-bold flex items-center justify-center font-cute ring-2 ring-white">
                              {(user?.fullName || 'ME').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight">
                          My Story
                        </h3>
                        <p className="text-xs font-cute text-[#7C5362] truncate mt-0.5">
                          {formatStoryTime(myStories[myStories.length - 1].createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section B: Updates from Friends (Filtered by All / Seen / Unseen) */}
            <div className={activeFilter === 'all' ? 'pt-2 border-t border-[#F7CAD0]/50' : 'pt-1'}>
              <div className="px-2.5 pb-1.5 flex items-center justify-between text-[12px] font-bold text-[#9A707E] uppercase tracking-wider">
                <span>
                  {activeFilter === 'seen'
                    ? 'Seen Updates'
                    : activeFilter === 'unseen'
                      ? 'Unseen Updates'
                      : 'Recent Updates'}
                </span>
                <span className="text-[11px] text-[#9A707E] lowercase">
                  ({filteredOtherStories.length})
                </span>
              </div>

              {isLoading ? (
                <div className="p-6 flex items-center justify-center text-[#9A707E] gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E05375]" />
                  <span>Loading updates...</span>
                </div>
              ) : filteredOtherStories.length === 0 ? (
                <div className="p-6 text-center text-[#7C5362] font-cute text-xs flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#FFEBF0] text-[#C24A68] flex items-center justify-center mb-2 shadow-2xs">
                    {activeFilter === 'seen' ? (
                      <Eye className="w-5 h-5 stroke-[2.2]" />
                    ) : activeFilter === 'unseen' ? (
                      <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                    ) : (
                      <CircleDot className="w-5 h-5 stroke-[2.2]" />
                    )}
                  </div>
                  <p className="font-bold text-sm text-[#2D151D]">
                    {searchQuery
                      ? 'No updates match search'
                      : activeFilter === 'seen'
                        ? 'No seen updates'
                        : activeFilter === 'unseen'
                          ? 'No unseen updates'
                          : 'No recent updates'}
                  </p>
                  <p className="text-xs text-[#9A707E] mt-0.5 max-w-[200px]">
                    {searchQuery
                      ? 'Try searching with a different name'
                      : activeFilter === 'seen'
                        ? 'Stories you have already viewed will appear here'
                        : activeFilter === 'unseen'
                          ? 'You are all caught up on all stories!'
                          : 'Stories from your contacts will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOtherStories.map((group, groupIdx) => {
                    const friend = group.user;
                    const latestStory = group.stories[group.stories.length - 1];

                    return (
                      <div
                        key={friend._id}
                        onClick={() => openStoryViewer(groupIdx, 0)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#FCEAEF] transition duration-150 cursor-pointer group"
                      >
                        {/* Avatar with Status Ring (Pink if hasUnviewed, Muted if viewed) */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={`p-0.5 rounded-full ${group.hasUnviewed
                              ? 'bg-gradient-to-tr from-[#E05375] to-[#741E34]'
                              : 'bg-[#E3CBD2]'
                              }`}
                          >
                            {friend.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getMediaUrl(friend.avatar)}
                                alt={friend.fullName || friend.username}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-2xs"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-[#FCE7EC] text-[#C24A68] text-sm font-bold flex items-center justify-center font-cute ring-2 ring-white shadow-2xs">
                                {(friend.fullName || friend.username).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Name & Time */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-cute text-[15.5px] font-bold text-[#2D151D] truncate leading-tight">
                            {friend.fullName || friend.username}
                          </h4>
                          <p className="text-xs font-cute text-[#7C5362] truncate mt-0.5">
                            {latestStory ? formatStoryTime(latestStory.createdAt) : 'Recently'}
                          </p>
                        </div>

                        {/* View Arrow */}
                        <div className="text-[#9A707E] group-hover:text-[#741E34] transition">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- INLINE UPLOAD STORY MODE (Accessible via header Add Story button) --- */}
        {isCreateMode && (
          <div className="bg-white rounded-2xl p-4 border border-[#F5CAD3] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#F7CAD0]/50">
              <span className="text-xs font-bold text-[#2D151D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E05375]" />
                <span>Upload Story</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreateMode(false)}
                className="text-[11px] text-[#C24A68] hover:underline cursor-pointer"
              >
                ← Back
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {uploadError}
              </div>
            )}

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#FFF0F3] rounded-xl border border-[#F7CAD0]">
              {(['image', 'video', 'text', 'link'] as StoryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setUploadType(t); resetUploadForm(); }}
                  className={`py-1.5 text-[12px] font-bold rounded-lg capitalize transition cursor-pointer ${uploadType === t
                    ? 'bg-[#E05375] text-white shadow-2xs'
                    : 'text-[#7D2338] hover:bg-white/50'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleInlineSubmit} className="space-y-3">
              {/* Image / Video File Picker */}
              {(uploadType === 'image' || uploadType === 'video') && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={uploadType === 'image' ? 'image/*' : 'video/*'}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-[#F7CAD0] hover:border-[#E05375] bg-[#FFF9FA] text-center text-xs font-bold text-[#7D2338] flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Upload className="w-5 h-5 text-[#E05375]" />
                      <span>Choose {uploadType === 'image' ? 'Photo' : 'Video'}</span>
                    </button>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-[#F5CAD3] bg-zinc-950 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {uploadType === 'image' && mediaPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaPreviewUrl}
                            alt="Preview"
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : mediaPreviewUrl ? (
                          <video
                            src={mediaPreviewUrl}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : null}
                        <span className="text-white text-xs truncate max-w-[150px]">
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setMediaPreviewUrl(null); }}
                        className="p-1 rounded-full text-zinc-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full px-3 py-2 rounded-xl border border-[#F5CAD3] bg-[#FFF9FA] text-xs font-cute text-[#2D151D] focus:outline-none focus:border-[#E05375]"
                  />
                </div>
              )}

              {/* Text story fields */}
              {uploadType === 'text' && (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type your story text..."
                    maxLength={350}
                    className="w-full p-2.5 rounded-xl border border-[#F5CAD3] bg-[#FFF9FA] text-xs font-cute text-[#2D151D] focus:outline-none focus:border-[#E05375] resize-none"
                  />

                  {/* Gradient pickers */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {TEXT_BACKGROUND_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedBackground(p.value)}
                        style={{ background: p.value }}
                        className={`w-6 h-6 rounded-full shrink-0 ring-1 cursor-pointer ${selectedBackground === p.value ? 'ring-[#E05375] scale-110' : 'ring-white'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Link story fields */}
              {uploadType === 'link' && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#F5CAD3] bg-[#FFF9FA] text-xs font-cute text-[#2D151D] focus:outline-none focus:border-[#E05375]"
                  />
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Link title or headline"
                    className="w-full px-3 py-2 rounded-xl border border-[#F5CAD3] bg-[#FFF9FA] text-xs font-cute text-[#2D151D] focus:outline-none focus:border-[#E05375]"
                  />
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-[#F5CAD3] bg-[#FFF9FA] text-xs font-cute text-[#2D151D] focus:outline-none focus:border-[#E05375]"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#E05375] hover:bg-[#D43D61] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Share to Story</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Mobile-Only Bottom Navigation Bar */}
      <MobileNavigation />
    </aside>
  );
};
