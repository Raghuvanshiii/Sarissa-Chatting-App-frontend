'use client';

import React, { useRef, useState } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  RotateCcw, 
  Upload, 
  Check, 
  SunMedium, 
  ShieldCheck,
  MessageSquare,
  Globe
} from 'lucide-react';
import { CHAT_WALLPAPERS, DEFAULT_WALLPAPER_ID, WallpaperOption } from '../../constants/wallpapers';
import { useWallpaperStore } from '../../store/useWallpaperStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { HoneycombBackground } from './HoneycombBackground';
import { User } from '../../types';

export const ChatWallpaperModal: React.FC = () => {
  const {
    currentWallpaperId,
    customWallpaperUrl,
    wallpaperDim,
    isWallpaperModalOpen,
    applyScope,
    setApplyScope,
    setWallpaper,
    setWallpaperDim,
    closeWallpaperModal,
    resetToDefault,
    getEffectiveWallpaper,
    activeConversationId,
  } = useWallpaperStore();

  const activeConversation = useChatStore((s) => s.activeConversation);
  const currentUser = useAuthStore((s) => s.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isWallpaperModalOpen) return null;

  const activeWallpaper = getEffectiveWallpaper(activeConversationId, currentUser?._id);

  // Determine chat name for scope pill
  let chatTitle = 'This Chat';
  if (activeConversation) {
    if (activeConversation.type === 'direct') {
      const otherUser = (activeConversation.participants || []).find((p) => {
        const id = typeof p === 'object' && p !== null ? (p as User)._id : p;
        return id !== currentUser?._id;
      });
      chatTitle = (typeof otherUser === 'object' && otherUser?.fullName) || 'Direct Chat';
    } else {
      chatTitle = activeConversation.name || 'Group Chat';
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB limit. Please choose a smaller file.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setWallpaper('custom', base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getWallpaperBackgroundStyle = (wp: WallpaperOption | { id: string; type: string; url?: string; css?: string; repeat?: boolean; size?: string }) => {
    if (wp.id === 'sarissa-honeycomb') {
      return {
        backgroundColor: '#FFFFFF',
        backgroundImage: 'url(/wallpapers/sarissa-honeycomb.svg)',
        backgroundRepeat: 'repeat',
        backgroundSize: '115px auto',
        backgroundPosition: 'top center',
      };
    }
    if (wp.type === 'image' || wp.type === 'pattern') {
      return {
        backgroundImage: `url(${wp.url})`,
        backgroundRepeat: wp.repeat ? 'repeat' : 'no-repeat',
        backgroundSize: wp.size || 'cover',
        backgroundPosition: 'center',
      };
    }
    if (wp.type === 'css') {
      return {
        backgroundImage: wp.css,
        backgroundRepeat: wp.repeat ? 'repeat' : 'no-repeat',
        backgroundSize: wp.size || 'cover',
      };
    }
    return {
      backgroundColor: 'transparent',
    };
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeWallpaperModal}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_24px_70px_rgba(194,74,104,0.2)] overflow-hidden flex flex-col transition-all duration-200 animate-in zoom-in-95 text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] flex items-center justify-center text-[#C24A68] shadow-2xs">
              <ImageIcon className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D151D] flex items-center gap-2">
                <span>Chat Wallpaper</span>
              </h2>
              <p className="text-xs text-[#7C5362] mt-0.5">
                {applyScope === 'chat' && activeConversation
                  ? `Setting background specifically for ${chatTitle}`
                  : 'Setting background across all your chats'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              title="Reset to default"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] border border-transparent hover:border-[#F5BAC6] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
            <button
              type="button"
              onClick={closeWallpaperModal}
              className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Privacy & User Isolation Guarantee Banner */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#E8F3EA] border border-[#BFDBCA] text-[#224A2D] text-xs shadow-2xs">
            <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-[#2B613B]" />
            <p className="leading-snug">
              <strong className="font-bold">Private to your account:</strong> This wallpaper only appears on your screen. Other chat participants will never see or have their own wallpapers affected.
            </p>
          </div>

          {/* Scope Selector: This Chat vs All Chats */}
          {activeConversation && (
            <div className="p-1 bg-[#FCE7EC] rounded-2xl border border-[#F5BAC6] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setApplyScope('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  applyScope === 'chat'
                    ? 'bg-[#C24A68] text-white shadow-2xs'
                    : 'text-[#7C5362] hover:text-[#2D151D]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="truncate">This Chat ({chatTitle})</span>
              </button>
              <button
                type="button"
                onClick={() => setApplyScope('all')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  applyScope === 'all'
                    ? 'bg-[#C24A68] text-white shadow-2xs'
                    : 'text-[#7C5362] hover:text-[#2D151D]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>All Chats</span>
              </button>
            </div>
          )}

          {/* Live Mini Preview with Chat Bubbles */}
          <div className="relative rounded-2xl border border-[#F5BAC6] overflow-hidden shadow-xs h-36 sm:h-40 flex flex-col justify-between p-3.5 sm:p-4 bg-zinc-950">
            {/* Background Texture Layer */}
            {activeWallpaper.id === 'sarissa-honeycomb' ? (
              <HoneycombBackground />
            ) : (
              <div
                className="absolute inset-0 z-0 transition-all duration-300 pointer-events-none"
                style={getWallpaperBackgroundStyle(activeWallpaper)}
              />
            )}
            {/* Dimming Layer */}
            {wallpaperDim > 0 && (
              <div
                className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200"
                style={{ opacity: wallpaperDim / 100 }}
              />
            )}

            {/* Top Preview Status */}
            <div className="relative z-10 flex items-center justify-between text-[12px] text-white/90">
              <span className="bg-black/55 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 font-semibold">
                Live Preview: {activeWallpaper.name}
              </span>
              {currentWallpaperId === DEFAULT_WALLPAPER_ID && (
                <span className="bg-[#C24A68] text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                  Default
                </span>
              )}
            </div>

            {/* Mock Chat Bubbles */}
            <div className="relative z-10 space-y-2 pointer-events-none">
              {/* Incoming Bubble */}
              <div className="flex items-end gap-2 max-w-[70%]">
                <div className="bg-white text-[#2D151D] text-[12px] px-3 py-1.5 rounded-xl rounded-bl-xs shadow-md border border-[#F5BAC6]/50">
                  <span>Hey! How does the new chat background look? ✨</span>
                </div>
              </div>
              {/* Outgoing Bubble */}
              <div className="flex items-end justify-end gap-2">
                <div className="bg-[#FCE7EC] text-[#9F2241] font-medium text-[12px] px-3 py-1.5 rounded-xl rounded-br-xs shadow-md border border-[#F5BAC6]">
                  <span>Looks super clean and aesthetic! 🐾</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dimming / Darkness Slider */}
          <div className="bg-white/80 p-4 rounded-2xl border border-[#F5BAC6] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="wallpaper-dim-slider" className="text-xs font-bold text-[#2D151D] flex items-center gap-1.5 cursor-pointer">
                <SunMedium className="w-4 h-4 text-[#C24A68]" />
                <span>Wallpaper Dimming</span>
              </label>
              <span className="text-xs font-mono font-bold text-[#7C5362]">
                {wallpaperDim}%
              </span>
            </div>
            <input
              id="wallpaper-dim-slider"
              type="range"
              min="0"
              max="70"
              step="1"
              value={wallpaperDim}
              onChange={(e) => setWallpaperDim(parseInt(e.target.value, 10))}
              className="w-full accent-[#C24A68] h-1.5 bg-[#FCE7EC] rounded-lg cursor-pointer"
            />
            <p className="text-[12px] text-[#7C5362]">
              Darken background for maximum message bubble and text readability.
            </p>
          </div>

          {/* Wallpaper Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-[#2D151D]">
                Choose Wallpaper
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#C24A68] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom</span>
              </button>
            </div>

            {uploadError && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#FFEBF0] text-[#9F2241] text-xs border border-[#F5BAC6]">
                {uploadError}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Custom Upload Card (if present) */}
              {customWallpaperUrl && (
                <div
                  onClick={() => setWallpaper('custom', customWallpaperUrl)}
                  className={`relative h-28 rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 group flex flex-col justify-end p-2.5 shadow-2xs ${
                    currentWallpaperId === 'custom'
                      ? 'border-[#C24A68] ring-2 ring-[#C24A68]/30'
                      : 'border-[#F5BAC6] hover:border-[#C24A68]/50'
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundImage: `url(${customWallpaperUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between text-white">
                    <span className="text-xs font-semibold truncate">Custom Upload</span>
                    {currentWallpaperId === 'custom' && (
                      <span className="w-5 h-5 rounded-full bg-[#C24A68] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Curated Presets */}
              {CHAT_WALLPAPERS.map((wp) => {
                const isSelected = currentWallpaperId === wp.id;
                const isDefault = wp.id === DEFAULT_WALLPAPER_ID;

                return (
                  <div
                    key={wp.id}
                    onClick={() => setWallpaper(wp.id)}
                    className={`relative h-28 rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 group flex flex-col justify-between p-2.5 shadow-2xs ${
                      isSelected
                        ? 'border-[#C24A68] ring-2 ring-[#C24A68]/30 scale-[1.01]'
                        : 'border-[#F5BAC6] hover:border-[#C24A68]/50'
                    }`}
                  >
                    {/* Background Surface representation */}
                    {wp.id === 'sarissa-honeycomb' ? (
                      <HoneycombBackground />
                    ) : (
                      <div
                        className="absolute inset-0 transition-transform duration-300 group-hover:scale-105 bg-zinc-900 pointer-events-none"
                        style={getWallpaperBackgroundStyle(wp)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 pointer-events-none" />

                    {/* Top Row: Default Badge */}
                    <div className="relative z-10 flex items-center justify-between">
                      {isDefault ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#C24A68] text-white text-[11px] font-bold shadow-xs">
                          Default
                        </span>
                      ) : (
                        <span />
                      )}

                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#C24A68] flex items-center justify-center text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Name */}
                    <div className="relative z-10 text-white">
                      <p className="text-xs font-bold leading-tight drop-shadow-xs">
                        {wp.name}
                      </p>
                      <p className="text-[11px] text-white/80 truncate mt-0.5">
                        {wp.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={closeWallpaperModal}
            className="px-5 py-2.5 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
