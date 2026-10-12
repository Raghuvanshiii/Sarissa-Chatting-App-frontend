'use client';

import { create } from 'zustand';
import { CHAT_WALLPAPERS, DEFAULT_WALLPAPER_ID, WallpaperOption } from '../constants/wallpapers';

const STORAGE_KEY_WALLPAPER_ID = 'sarissa_wallpaper_id_v2';
const STORAGE_KEY_CUSTOM_URL = 'sarissa_wallpaper_custom_url_v2';
const STORAGE_KEY_WALLPAPER_DIM = 'sarissa_wallpaper_dim_v2';

const LEGACY_STORAGE_KEY_WALLPAPER_ID = 'sambandh_wallpaper_id_v2';
const LEGACY_STORAGE_KEY_CUSTOM_URL = 'sambandh_wallpaper_custom_url_v2';
const LEGACY_STORAGE_KEY_WALLPAPER_DIM = 'sambandh_wallpaper_dim_v2';

const getGlobalKey = (userId: string, key: 'id' | 'custom' | 'dim'): string => {
  return `sarissa_wp_${userId}_global_${key}`;
};

const getConvKey = (userId: string, convId: string, key: 'id' | 'custom' | 'dim'): string => {
  return `sarissa_wp_${userId}_conv_${convId}_${key}`;
};

const getLegacyGlobalKey = (userId: string, key: 'id' | 'custom' | 'dim'): string => {
  return `sambandh_wp_${userId}_global_${key}`;
};

const getLegacyConvKey = (userId: string, convId: string, key: 'id' | 'custom' | 'dim'): string => {
  return `sambandh_wp_${userId}_conv_${convId}_${key}`;
};

export interface WallpaperState {
  activeUserId: string | null;
  activeConversationId: string | null;

  currentWallpaperId: string;
  customWallpaperUrl: string | null;
  wallpaperDim: number; // 0 to 70%
  isWallpaperModalOpen: boolean;
  applyScope: 'chat' | 'all';

  setApplyScope: (scope: 'chat' | 'all') => void;
  setActiveContext: (userId: string | null, conversationId?: string | null) => void;
  setWallpaper: (id: string, customUrl?: string | null) => void;
  setWallpaperDim: (dim: number) => void;
  openWallpaperModal: (conversationId?: string | null) => void;
  closeWallpaperModal: () => void;
  resetToDefault: () => void;

  getEffectiveWallpaper: (conversationId?: string | null, userId?: string | null) => WallpaperOption;
  getEffectiveDim: (conversationId?: string | null, userId?: string | null) => number;
}

const resolveEffectiveValues = (
  userId: string | null,
  convId: string | null
): { wallpaperId: string; customUrl: string | null; dim: number } => {
  if (typeof window === 'undefined') {
    return { wallpaperId: DEFAULT_WALLPAPER_ID, customUrl: null, dim: 0 };
  }

  const uId = userId || 'anonymous';

  try {
    // 1. Check conversation-specific preference if conversationId is provided
    if (convId) {
      const convWp = localStorage.getItem(getConvKey(uId, convId, 'id')) || localStorage.getItem(getLegacyConvKey(uId, convId, 'id'));
      if (convWp) {
        const convCustom = localStorage.getItem(getConvKey(uId, convId, 'custom')) || localStorage.getItem(getLegacyConvKey(uId, convId, 'custom'));
        const convDimStr = localStorage.getItem(getConvKey(uId, convId, 'dim')) ?? localStorage.getItem(getLegacyConvKey(uId, convId, 'dim'));
        const convDim = convDimStr !== null ? parseInt(convDimStr, 10) : 0;
        return {
          wallpaperId: convWp,
          customUrl: convCustom,
          dim: isNaN(convDim) ? 0 : Math.max(0, Math.min(70, convDim)),
        };
      }
    }

    // 2. Check user's global preference
    const globalWp = localStorage.getItem(getGlobalKey(uId, 'id')) || localStorage.getItem(getLegacyGlobalKey(uId, 'id'));
    if (globalWp) {
      const globalCustom = localStorage.getItem(getGlobalKey(uId, 'custom')) || localStorage.getItem(getLegacyGlobalKey(uId, 'custom'));
      const globalDimStr = localStorage.getItem(getGlobalKey(uId, 'dim')) ?? localStorage.getItem(getLegacyGlobalKey(uId, 'dim'));
      const globalDim = globalDimStr !== null ? parseInt(globalDimStr, 10) : 0;
      return {
        wallpaperId: globalWp,
        customUrl: globalCustom,
        dim: isNaN(globalDim) ? 0 : Math.max(0, Math.min(70, globalDim)),
      };
    }

    // 3. Fallback to legacy key only if anonymous/first-time migration
    if (!userId) {
      const legacyWp = localStorage.getItem(STORAGE_KEY_WALLPAPER_ID) || localStorage.getItem(LEGACY_STORAGE_KEY_WALLPAPER_ID);
      if (legacyWp) {
        const legacyCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_URL) || localStorage.getItem(LEGACY_STORAGE_KEY_CUSTOM_URL);
        const legacyDimStr = localStorage.getItem(STORAGE_KEY_WALLPAPER_DIM) ?? localStorage.getItem(LEGACY_STORAGE_KEY_WALLPAPER_DIM);
        const legacyDim = legacyDimStr !== null ? parseInt(legacyDimStr, 10) : 0;
        return {
          wallpaperId: legacyWp,
          customUrl: legacyCustom,
          dim: isNaN(legacyDim) ? 0 : Math.max(0, Math.min(70, legacyDim)),
        };
      }
    }
  } catch {}

  return { wallpaperId: DEFAULT_WALLPAPER_ID, customUrl: null, dim: 0 };
};

export const useWallpaperStore = create<WallpaperState>((set, get) => {
  const initialResolved = resolveEffectiveValues(null, null);

  return {
    activeUserId: null,
    activeConversationId: null,

    currentWallpaperId: initialResolved.wallpaperId,
    customWallpaperUrl: initialResolved.customUrl,
    wallpaperDim: initialResolved.dim,
    isWallpaperModalOpen: false,
    applyScope: 'chat',

    setApplyScope: (scope: 'chat' | 'all') => set({ applyScope: scope }),

    setActiveContext: (userId: string | null, conversationId?: string | null) => {
      const convId = conversationId !== undefined ? conversationId : get().activeConversationId;
      const resolved = resolveEffectiveValues(userId, convId);
      set({
        activeUserId: userId,
        activeConversationId: convId,
        currentWallpaperId: resolved.wallpaperId,
        customWallpaperUrl: resolved.customUrl,
        wallpaperDim: resolved.dim,
        applyScope: convId ? 'chat' : 'all',
      });
    },

    setWallpaper: (id: string, customUrl: string | null = null) => {
      const { activeUserId, activeConversationId, applyScope, customWallpaperUrl } = get();
      const uId = activeUserId || 'anonymous';
      const cId = activeConversationId;
      const finalCustomUrl = customUrl !== undefined ? customUrl : customWallpaperUrl;

      if (typeof window !== 'undefined') {
        try {
          if (applyScope === 'chat' && cId) {
            // Save strictly to this specific conversation for this specific user
            localStorage.setItem(getConvKey(uId, cId, 'id'), id);
            if (id === 'custom' && finalCustomUrl) {
              localStorage.setItem(getConvKey(uId, cId, 'custom'), finalCustomUrl);
            } else if (id !== 'custom') {
              localStorage.removeItem(getConvKey(uId, cId, 'custom'));
            }
          } else {
            // Save as global default for this user
            localStorage.setItem(getGlobalKey(uId, 'id'), id);
            if (id === 'custom' && finalCustomUrl) {
              localStorage.setItem(getGlobalKey(uId, 'custom'), finalCustomUrl);
            } else if (id !== 'custom') {
              localStorage.removeItem(getGlobalKey(uId, 'custom'));
            }
          }
        } catch {}
      }

      set({
        currentWallpaperId: id,
        customWallpaperUrl: finalCustomUrl,
      });
    },

    setWallpaperDim: (dim: number) => {
      const safeDim = Math.max(0, Math.min(70, dim));
      const { activeUserId, activeConversationId, applyScope } = get();
      const uId = activeUserId || 'anonymous';
      const cId = activeConversationId;

      if (typeof window !== 'undefined') {
        try {
          if (applyScope === 'chat' && cId) {
            localStorage.setItem(getConvKey(uId, cId, 'dim'), String(safeDim));
          } else {
            localStorage.setItem(getGlobalKey(uId, 'dim'), String(safeDim));
          }
        } catch {}
      }

      set({ wallpaperDim: safeDim });
    },

    openWallpaperModal: (conversationId?: string | null) => {
      const targetConvId =
        conversationId !== undefined ? conversationId : get().activeConversationId;
      const { activeUserId } = get();
      const resolved = resolveEffectiveValues(activeUserId, targetConvId);

      set({
        activeConversationId: targetConvId,
        currentWallpaperId: resolved.wallpaperId,
        customWallpaperUrl: resolved.customUrl,
        wallpaperDim: resolved.dim,
        applyScope: targetConvId ? 'chat' : 'all',
        isWallpaperModalOpen: true,
      });
    },

    closeWallpaperModal: () => set({ isWallpaperModalOpen: false }),

    resetToDefault: () => {
      const { activeUserId, activeConversationId, applyScope } = get();
      const uId = activeUserId || 'anonymous';
      const cId = activeConversationId;

      if (typeof window !== 'undefined') {
        try {
          if (applyScope === 'chat' && cId) {
            localStorage.removeItem(getConvKey(uId, cId, 'id'));
            localStorage.removeItem(getConvKey(uId, cId, 'custom'));
            localStorage.removeItem(getConvKey(uId, cId, 'dim'));
            localStorage.removeItem(getLegacyConvKey(uId, cId, 'id'));
            localStorage.removeItem(getLegacyConvKey(uId, cId, 'custom'));
            localStorage.removeItem(getLegacyConvKey(uId, cId, 'dim'));
          } else {
            localStorage.setItem(getGlobalKey(uId, 'id'), DEFAULT_WALLPAPER_ID);
            localStorage.removeItem(getGlobalKey(uId, 'custom'));
            localStorage.setItem(getGlobalKey(uId, 'dim'), '0');
            localStorage.removeItem(getLegacyGlobalKey(uId, 'id'));
            localStorage.removeItem(getLegacyGlobalKey(uId, 'custom'));
            localStorage.removeItem(getLegacyGlobalKey(uId, 'dim'));
          }
        } catch {}
      }

      const reResolved = resolveEffectiveValues(activeUserId, applyScope === 'chat' ? null : cId);
      set({
        currentWallpaperId: reResolved.wallpaperId,
        customWallpaperUrl: reResolved.customUrl,
        wallpaperDim: reResolved.dim,
      });
    },

    getEffectiveWallpaper: (conversationId?: string | null, userId?: string | null) => {
      const targetUserId = userId !== undefined ? userId : get().activeUserId;
      const targetConvId =
        conversationId !== undefined ? conversationId : get().activeConversationId;

      const { wallpaperId, customUrl } = resolveEffectiveValues(targetUserId, targetConvId);

      if (wallpaperId === 'custom' && customUrl) {
        return {
          id: 'custom',
          name: 'Custom Wallpaper',
          category: 'illustration',
          type: 'image',
          url: customUrl,
          repeat: false,
          size: 'cover',
          description: 'Uploaded from your device',
        };
      }

      const found = CHAT_WALLPAPERS.find((w) => w.id === wallpaperId);
      return found || CHAT_WALLPAPERS[0];
    },

    getEffectiveDim: (conversationId?: string | null, userId?: string | null) => {
      const targetUserId = userId !== undefined ? userId : get().activeUserId;
      const targetConvId =
        conversationId !== undefined ? conversationId : get().activeConversationId;

      const { dim } = resolveEffectiveValues(targetUserId, targetConvId);
      return dim;
    },
  };
});
