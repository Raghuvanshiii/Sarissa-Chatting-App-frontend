import { create } from 'zustand';
import { SocketConnectionState, ServerHealthResponse } from '../types';
import { getStoredToken } from '../utils/tokenStorage';

interface SocketLogEntry {
  id: string;
  time: string;
  event: string;
  data?: unknown;
}

export interface CallHistoryEntry {
  id: string;
  conversationId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  callType: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string | Date;
  durationText?: string;
  isGroup?: boolean;
  isMissed?: boolean;
  isOwn?: boolean;
}

interface AppState {
  theme: 'dark' | 'light';
  initTheme: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  
  socketStatus: SocketConnectionState;
  setSocketStatus: (status: SocketConnectionState) => void;
  
  serverHealth: ServerHealthResponse | null;
  setServerHealth: (health: ServerHealthResponse | null) => void;
  
  isDetailsPanelOpen: boolean;
  toggleDetailsPanel: () => void;
  openDetailsPanel: () => void;
  closeDetailsPanel: () => void;

  isSearchInChatOpen: boolean;
  toggleSearchInChat: () => void;
  setSearchInChatOpen: (open: boolean) => void;

  triggerCall: { type: 'audio' | 'video'; timestamp: number } | null;
  requestCall: (type: 'audio' | 'video') => void;
  clearTriggerCall: () => void;

  mutedConversations: Record<string, '8h' | '1w' | 'always'>;
  setConversationMuted: (conversationId: string, duration?: '8h' | '1w' | 'always' | 'unmute') => void;
  
  favoriteConversations: Record<string, boolean>;
  toggleFavoriteConversation: (conversationId: string) => void;

  favoriteContacts: Record<string, boolean>;
  toggleFavoriteContact: (contactId: string) => void;

  currentNavTab: string;
  setCurrentNavTab: (tab: string) => void;

  callHistory: CallHistoryEntry[];
  addCallHistoryEntry: (entry: Omit<CallHistoryEntry, 'id'>) => void;
  clearCallHistory: () => void;

  socketLogs: SocketLogEntry[];
  addSocketLog: (event: string, data?: unknown) => void;
  clearSocketLogs: () => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('chat_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
  }
  return 'light';
};

const getInitialMuted = (): Record<string, '8h' | '1w' | 'always'> => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('chat_muted_conversations');
      if (saved) return JSON.parse(saved);
    } catch {}
  }
  return {};
};

const getInitialFavorites = (): Record<string, boolean> => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('chat_favorite_conversations');
      if (saved) return JSON.parse(saved);
    } catch {}
  }
  return {};
};

export const useAppStore = create<AppState>((set) => ({
  theme: getInitialTheme(),
  initTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = getStoredToken();
      if (!token) {
        document.documentElement.classList.remove('dark');
        return;
      }
      const saved = localStorage.getItem('chat_theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme: 'dark' | 'light' =
        saved === 'dark' || saved === 'light'
          ? saved
          : prefersDark
          ? 'dark'
          : 'light';

      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme: currentTheme });
    } catch {}
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat_theme', nextTheme);
          const token = getStoredToken();
          if (token && nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch {}
      }
      return { theme: nextTheme };
    }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chat_theme', theme);
        const token = getStoredToken();
        if (token && theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {}
    }
    set({ theme });
  },

  socketStatus: 'disconnected',
  setSocketStatus: (socketStatus) => set({ socketStatus }),

  serverHealth: null,
  setServerHealth: (serverHealth) => set({ serverHealth }),

  isDetailsPanelOpen: true,
  toggleDetailsPanel: () => set((state) => ({ isDetailsPanelOpen: !state.isDetailsPanelOpen })),
  openDetailsPanel: () => set({ isDetailsPanelOpen: true }),
  closeDetailsPanel: () => set({ isDetailsPanelOpen: false }),

  isSearchInChatOpen: false,
  toggleSearchInChat: () => set((state) => ({ isSearchInChatOpen: !state.isSearchInChatOpen })),
  setSearchInChatOpen: (isSearchInChatOpen) => set({ isSearchInChatOpen }),

  triggerCall: null,
  requestCall: (type) => set({ triggerCall: { type, timestamp: Date.now() } }),
  clearTriggerCall: () => set({ triggerCall: null }),

  mutedConversations: getInitialMuted(),
  setConversationMuted: (conversationId, duration) =>
    set((state) => {
      const next = { ...state.mutedConversations };
      if (!duration || duration === 'unmute') {
        delete next[conversationId];
      } else {
        next[conversationId] = duration;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat_muted_conversations', JSON.stringify(next));
        } catch {}
      }
      return { mutedConversations: next };
    }),

  favoriteConversations: getInitialFavorites(),
  toggleFavoriteConversation: (conversationId) =>
    set((state) => {
      const next = { ...state.favoriteConversations };
      if (next[conversationId]) {
        delete next[conversationId];
      } else {
        next[conversationId] = true;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat_favorite_conversations', JSON.stringify(next));
        } catch {}
      }
      return { favoriteConversations: next };
    }),

  favoriteContacts: (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chat_favorite_contacts');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  })(),
  toggleFavoriteContact: (contactId) =>
    set((state) => {
      const next = { ...state.favoriteContacts };
      if (next[contactId]) {
        delete next[contactId];
      } else {
        next[contactId] = true;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat_favorite_contacts', JSON.stringify(next));
        } catch {}
      }
      return { favoriteContacts: next };
    }),

  currentNavTab: 'chats',
  setCurrentNavTab: (tab: string) => set({ currentNavTab: tab }),

  callHistory: (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chat_call_history');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  })(),
  addCallHistoryEntry: (entry) =>
    set((state) => {
      const newEntry: CallHistoryEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 9),
      };
      const updated = [newEntry, ...state.callHistory].slice(0, 50);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chat_call_history', JSON.stringify(updated));
        } catch {}
      }
      return { callHistory: updated };
    }),
  clearCallHistory: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('chat_call_history');
      } catch {}
    }
    set({ callHistory: [] });
  },

  socketLogs: [],
  addSocketLog: (event, data) =>
    set((state) => ({
      socketLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString(),
          event,
          data
        },
        ...state.socketLogs.slice(0, 49) // retain last 50 events
      ]
    })),
  clearSocketLogs: () => set({ socketLogs: [] })
}));

export const setCurrentNavTab = (tab: string) => {
  useAppStore.setState({ currentNavTab: tab });
};
