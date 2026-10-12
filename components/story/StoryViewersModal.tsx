'use client';

import React from 'react';
import { X, Eye, Loader2, Clock, Users } from 'lucide-react';
import { StoryViewer } from '../../types/story';
import { getMediaUrl } from '../../utils/media';

interface StoryViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewers: StoryViewer[];
  isLoading: boolean;
}

function formatViewTime(dateString?: string): string {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const StoryViewersModal: React.FC<StoryViewersModalProps> = ({
  isOpen,
  onClose,
  viewers,
  isLoading,
}) => {
  if (!isOpen) return null;

  const seen = new Set<string>();
  const validViewers: StoryViewer[] = [];
  for (const item of viewers || []) {
    if (!item || !item.user) continue;
    const uid = typeof item.user === 'object' && item.user ? String(item.user._id) : (item.user ? String(item.user) : null);
    if (uid && !seen.has(uid)) {
      seen.add(uid);
      validViewers.push(item);
    }
  }

  return (
    <div 
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.2)] overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[600px] animate-in slide-in-from-bottom-5 duration-200 text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center shadow-2xs border border-[#F5BAC6]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D151D]">
                Story Viewers
              </h3>
              <p className="text-[12px] text-[#7C5362]">
                {validViewers.length} {validViewers.length === 1 ? 'person viewed' : 'people viewed'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewers List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-1.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#7C5362]">
              <Loader2 className="w-5 h-5 animate-spin mb-2 text-[#C24A68]" />
              <p className="text-xs">Loading viewers...</p>
            </div>
          ) : validViewers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[#FFEBF0] border border-[#F5BAC6] flex items-center justify-center text-[#C24A68] mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-[#2D151D]">
                No views yet
              </h4>
              <p className="text-[12px] text-[#7C5362] mt-1 max-w-[200px]">
                When your connections watch this story, they will appear right here.
              </p>
            </div>
          ) : (
            validViewers.map((viewerItem, idx) => {
              const u = viewerItem.user;
              if (!u) return null;

              return (
                <div
                  key={typeof viewerItem.user === 'object' && viewerItem.user?._id ? viewerItem.user._id : idx}
                  className="p-2.5 rounded-2xl bg-white/90 border border-[#F5BAC6] flex items-center justify-between gap-3 shadow-2xs hover:border-[#C24A68] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-[#F5BAC6]">
                      {u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(u.avatar)}
                          alt={u.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#FCE7EC] text-[#C24A68] text-xs font-bold flex items-center justify-center">
                          {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#2D151D] truncate leading-snug">
                        {u.fullName}
                      </p>
                      <p className="text-[11.5px] text-[#7C5362] truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  {/* Viewed Time */}
                  <div className="flex items-center gap-1 text-[11.5px] text-[#7C5362] font-mono shrink-0">
                    <Clock className="w-3 h-3 text-[#C24A68]" />
                    <span>{formatViewTime(viewerItem.viewedAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
