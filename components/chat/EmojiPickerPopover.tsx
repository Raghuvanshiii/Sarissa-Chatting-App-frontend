'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, Search, Sparkles, Smile, Image as ImageIcon, Sticker as StickerIcon, Loader2 } from 'lucide-react';
import { EmojiStyle, Theme, SkinTonePickerLocation, SuggestionMode, EmojiClickData } from 'emoji-picker-react';
import { useAppStore } from '../../store/useAppStore';

// Dynamically import EmojiPicker to optimize bundle and avoid any SSR mismatches
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-[#7C5362]">
      <Loader2 className="w-7 h-7 animate-spin text-[#C24A68]" />
      <span className="text-xs font-medium">Loading WhatsApp Emojis...</span>
    </div>
  ),
});

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectGif?: (gifUrl: string) => void;
  onSelectSticker?: (stickerUrl: string) => void;
  isModal?: boolean;
  title?: string;
}

type TabType = 'emoji' | 'gif' | 'sticker';

interface ReactionMediaItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

// Curated WhatsApp-style reaction GIFs
const CURATED_GIFS: Record<string, ReactionMediaItem[]> = {
  trending: [
    {
      id: 'g1',
      title: 'Mind Blown',
      url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif',
    },
    {
      id: 'g2',
      title: 'Laughing Cat',
      url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/mlvseq9yvZhba/200w.gif',
    },
    {
      id: 'g3',
      title: 'Thumbs Up',
      url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif',
    },
    {
      id: 'g4',
      title: 'Dancing Doge',
      url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif',
    },
    {
      id: 'g5',
      title: 'Party Celebration',
      url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif',
    },
    {
      id: 'g6',
      title: 'Applause',
      url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/200w.gif',
    },
    {
      id: 'g7',
      title: 'Shocked',
      url: 'https://media.giphy.com/media/3o72F8t9TDi2xVnxOE/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/3o72F8t9TDi2xVnxOE/200w.gif',
    },
    {
      id: 'g8',
      title: 'Heart Love',
      url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/200w.gif',
    },
  ],
  haha: [
    {
      id: 'g9',
      title: 'Rolling Laugh',
      url: 'https://media.giphy.com/media/xr9AQyxLtjlxS/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/xr9AQyxLtjlxS/200w.gif',
    },
    {
      id: 'g10',
      title: 'Minion Laugh',
      url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif',
    },
    {
      id: 'g11',
      title: 'Wheeze',
      url: 'https://media.giphy.com/media/26n6Gx9moCpHU1HO8/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/26n6Gx9moCpHU1HO8/200w.gif',
    },
    {
      id: 'g12',
      title: 'Office Laugh',
      url: 'https://media.giphy.com/media/Z9OGuQyrfHAE8/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/Z9OGuQyrfHAE8/200w.gif',
    },
  ],
  love: [
    {
      id: 'g13',
      title: 'Love Hug',
      url: 'https://media.giphy.com/media/X3Yj4XXXieKYM/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/X3Yj4XXXieKYM/200w.gif',
    },
    {
      id: 'g14',
      title: 'Cute Heart',
      url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200w.gif',
    },
  ],
  party: [
    {
      id: 'g15',
      title: 'Confetti',
      url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif',
    },
    {
      id: 'g16',
      title: 'Celebrate',
      url: 'https://media.giphy.com/media/lMameLIF8ymwx5W4LQ/giphy.gif',
      previewUrl: 'https://media.giphy.com/media/lMameLIF8ymwx5W4LQ/200w.gif',
    },
  ],
};

// WhatsApp-style cute chat stickers
const CURATED_STICKERS: ReactionMediaItem[] = [
  {
    id: 's1',
    title: 'Happy Cat',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616430.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616430.png',
  },
  {
    id: 's2',
    title: 'Cool Doge',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616408.png',
  },
  {
    id: 's3',
    title: 'Cute Panda',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616438.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616438.png',
  },
  {
    id: 's4',
    title: 'Thumbs Up Bear',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616412.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616412.png',
  },
  {
    id: 's5',
    title: 'Party Fox',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616443.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616443.png',
  },
  {
    id: 's6',
    title: 'Heart Koala',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616417.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616417.png',
  },
  {
    id: 's7',
    title: 'Winking Tiger',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616445.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616445.png',
  },
  {
    id: 's8',
    title: 'Sleepy Sloth',
    url: 'https://cdn-icons-png.flaticon.com/512/616/616441.png',
    previewUrl: 'https://cdn-icons-png.flaticon.com/512/616/616441.png',
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectGif,
  onSelectSticker,
  isModal = false,
  title,
}) => {
  const { theme } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('emoji');
  const [gifCategory, setGifCategory] = useState<string>('trending');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab when picker opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('emoji');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelectEmoji(emojiData.emoji);
    if (isModal) {
      onClose();
    }
  };

  const handleMediaClick = (type: 'gif' | 'sticker', item: ReactionMediaItem) => {
    if (type === 'gif' && onSelectGif) {
      onSelectGif(item.url);
      onClose();
    } else if (type === 'sticker' && onSelectSticker) {
      onSelectSticker(item.url);
      onClose();
    }
  };

  // Filter GIFs
  const displayedGifs = (() => {
    if (gifSearchQuery.trim()) {
      const q = gifSearchQuery.toLowerCase();
      const all = Object.values(CURATED_GIFS).flat();
      return all.filter((g) => g.title.toLowerCase().includes(q));
    }
    return CURATED_GIFS[gifCategory] || CURATED_GIFS.trending;
  })();

  const pickerCard = (
    <div
      ref={containerRef}
      className={`${
        isModal
          ? 'w-[360px] sm:w-[420px] h-[480px] bg-[#FFF5F7] border border-[#F5BAC6] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none z-50 text-[#2D151D]'
          : 'absolute bottom-full left-1 sm:left-4 mb-3 z-50 w-[340px] sm:w-[390px] h-[460px] bg-[#FFF5F7] border border-[#F5BAC6] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none text-[#2D151D]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* WhatsApp Modal Header (shown when opened as reaction modal) */}
      {isModal && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F5BAC6] bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="text-xs font-bold text-[#2D151D]">
              {title || 'React with Emoji'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 w-full h-full overflow-hidden flex flex-col relative">
        {activeTab === 'emoji' && (
          <div className="w-full h-full flex-1 overflow-hidden emoji-picker-wrapper">
            <EmojiPicker
              emojiStyle={EmojiStyle.APPLE}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              width="100%"
              height="100%"
              searchPlaceHolder="Search emoji..."
              skinTonesDisabled={false}
              skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
              suggestedEmojisMode={SuggestionMode.RECENT}
              previewConfig={{
                showPreview: true,
                defaultCaption: isModal ? "Select an emoji to react" : "Select an emoji to send",
              }}
              lazyLoadEmojis={true}
              onEmojiClick={handleEmojiClick}
            />
          </div>
        )}

        {/* WhatsApp GIF Tab */}
        {activeTab === 'gif' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden bg-[#FFF5F7]">
            {/* Search GIF */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7C5362] pointer-events-none" />
              <input
                type="text"
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                placeholder="Search Tenor GIFs..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white border border-[#F5BAC6] focus:outline-none focus:ring-1 focus:ring-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]"
              />
              {gifSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGifSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#7C5362] hover:text-[#C24A68]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            {!gifSearchQuery && (
              <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'trending', label: '🔥 Trending' },
                  { id: 'haha', label: '😂 Laugh' },
                  { id: 'love', label: '❤️ Love' },
                  { id: 'party', label: '🎉 Party' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setGifCategory(chip.id)}
                    className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap cursor-pointer ${
                      gifCategory === chip.id
                        ? 'bg-[#C24A68] text-white shadow-xs'
                        : 'bg-white border border-[#F5BAC6] text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FFEBF0]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* GIF Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {displayedGifs.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-xs text-[#7C5362]">
                  No GIFs found for &ldquo;{gifSearchQuery}&rdquo;
                </div>
              ) : (
                displayedGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleMediaClick('gif', gif)}
                    className="relative group rounded-xl overflow-hidden bg-black/10 aspect-video hover:scale-[1.02] transition cursor-pointer border border-[#F5BAC6] shadow-xs"
                    title={`Send ${gif.title}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                      Send GIF
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Sticker Tab */}
        {activeTab === 'sticker' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden bg-[#FFF5F7]">
            <div className="text-[12px] font-bold text-[#7C5362] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <StickerIcon className="w-3.5 h-3.5 text-[#C24A68]" />
              <span>Chat Stickers</span>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 p-1">
              {CURATED_STICKERS.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handleMediaClick('sticker', stk)}
                  className="p-2 rounded-xl bg-white border border-[#F5BAC6] hover:border-[#C24A68] hover:bg-[#FFEBF0] hover:scale-105 transition flex items-center justify-center aspect-square cursor-pointer shadow-2xs group"
                  title={`Send ${stk.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stk.url}
                    alt={stk.title}
                    loading="lazy"
                    className="w-12 h-12 object-contain select-none pointer-events-none group-hover:rotate-6 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sarissa Bottom Switcher Bar (Emoji, GIF, Sticker) */}
      {!isModal && (
        <div className="px-3 py-2 border-t border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-center gap-1">
          <div className="inline-flex items-center p-1 rounded-xl bg-white/80 border border-[#F5BAC6] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('emoji')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                activeTab === 'emoji'
                  ? 'bg-[#FCE7EC] text-[#9F2241] font-bold shadow-xs border border-[#F5BAC6]'
                  : 'text-[#7C5362] hover:text-[#2D151D]'
              }`}
              title="Emojis"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emoji</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gif')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                activeTab === 'gif'
                  ? 'bg-[#FCE7EC] text-[#9F2241] font-bold shadow-xs border border-[#F5BAC6]'
                  : 'text-[#7C5362] hover:text-[#2D151D]'
              }`}
              title="GIFs"
            >
              <span className="text-[11px] font-bold tracking-wider uppercase border border-current px-1 py-0.2 rounded-xs leading-none">
                GIF
              </span>
              <span>GIF</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sticker')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                activeTab === 'sticker'
                  ? 'bg-[#FCE7EC] text-[#9F2241] font-bold shadow-xs border border-[#F5BAC6]'
                  : 'text-[#7C5362] hover:text-[#2D151D]'
              }`}
              title="Stickers"
            >
              <StickerIcon className="w-3.5 h-3.5" />
              <span>Sticker</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      >
        {pickerCard}
      </div>
    );
  }

  return pickerCard;
};
