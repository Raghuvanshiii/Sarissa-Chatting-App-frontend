'use client';

import React, { useEffect } from 'react';
import { Plus, Sparkles, CircleDot } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoryStore } from '../../store/useStoryStore';
import { getMediaUrl } from '../../utils/media';

export const StoriesTray: React.FC = () => {
  const { user } = useAuthStore();
  const {
    myStories,
    otherStories,
    isLoading,
    fetchStories,
    openStoryViewer,
    openCreateStory,
  } = useStoryStore();

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const hasMyStories = myStories.length > 0;

  return (
    <div className="px-4 py-3 border-b border-[#F5BAC6] bg-transparent select-none">
      {/* Title / Action Header */}
      <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
        <CircleDot className="w-4 h-4 text-[#C24A68]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7C5362]">
          Stories
        </h3>
      </div>

      {/* Horizontal Avatars Scroll Track */}
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
        {/* 1. "My Story" Circle */}
        <div className="flex flex-col items-center gap-1 shrink-0 group">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (hasMyStories) {
                  openStoryViewer(-1, 0);
                } else {
                  openCreateStory();
                }
              }}
              title={hasMyStories ? `View your ${myStories.length} stories` : 'Add your story'}
              className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 cursor-pointer ${hasMyStories
                ? 'bg-gradient-to-tr from-[#C24A68] to-[#F09DAF] shadow-xs'
                : 'border border-dashed border-[#F5BAC6]'
                }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FFF5F7] p-0.5">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getMediaUrl(user.avatar)}
                    alt={user.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#FFEBF0] text-[#C24A68] text-xs font-bold flex items-center justify-center">
                    {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
              </div>
            </button>

            {/* Plus badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCreateStory();
              }}
              title="Add to story"
              className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-[#C24A68] text-white flex items-center justify-center ring-2 ring-[#FFF5F7] shadow-xs hover:bg-[#B83253] transition cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          <span className="text-[12px] font-medium text-[#2D151D] truncate max-w-[62px]">
            {hasMyStories ? 'Your Story' : 'Add Story'}
          </span>
        </div>

        {/* 2. Other Users' Stories */}
        {otherStories.map((group, idx) => {
          const author = group.user;
          const hasUnviewed = group.hasUnviewed;

          return (
            <button
              key={author._id}
              type="button"
              onClick={() => openStoryViewer(idx, 0)}
              title={`${author.fullName} (${group.stories.length} ${group.stories.length === 1 ? 'story' : 'stories'
                })`}
              className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${hasUnviewed
                  ? 'bg-gradient-to-tr from-[#C24A68] via-[#E07A93] to-[#F09DAF] shadow-xs'
                  : 'border border-[#F5BAC6]'
                  }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#FFF5F7] p-0.5">
                  {author.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(author.avatar)}
                      alt={author.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#C24A68] to-[#E07A93] text-white text-xs font-bold flex items-center justify-center">
                      {author.fullName ? author.fullName.slice(0, 2).toUpperCase() : 'ST'}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-[12px] font-medium text-[#2D151D] truncate max-w-[64px]">
                {author.fullName.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Empty state hint if no other stories */}
        {otherStories.length === 0 && !isLoading && (
          <div className="flex items-center pl-1 text-[12px] text-[#94928B] dark:text-[#7E7C74] italic">

          </div>
        )}
      </div>
    </div>
  );
};
