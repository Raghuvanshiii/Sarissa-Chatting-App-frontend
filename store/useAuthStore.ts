import { create } from 'zustand';
import { User, UserStatus } from '../types';
import { 
  apiService, 
  RegisterPayload, 
  LoginPayload, 
  UpdateProfilePayload, 
  ChangePasswordPayload,
  ResetPasswordPayload 
} from '../services/api';
import { getStoredToken, setStoredToken, removeStoredToken } from '../utils/tokenStorage';
import { useWallpaperStore } from './useWallpaperStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  isProfileModalOpen: boolean;

  // Actions
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  clearError: () => void;

  initAuth: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message: string; user?: User }>;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
  changePassword: (payload: ChangePasswordPayload) => Promise<boolean>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ success: boolean; message: string }>;
  deleteAccount: (password?: string) => Promise<{ success: boolean; message: string }>;
  setStatus: (status: UserStatus) => Promise<void>;
}


export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,
  isAuthModalOpen: false,
  authModalTab: 'login',
  isProfileModalOpen: false,

  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab, error: null }),
  closeAuthModal: () => set({ isAuthModalOpen: false, error: null }),
  openProfileModal: () => set({ isProfileModalOpen: true, error: null }),
  closeProfileModal: () => set({ isProfileModalOpen: false, error: null }),
  clearError: () => set({ error: null }),

  initAuth: async () => {
    if (typeof window === 'undefined') return;

    try {
      const storedToken = getStoredToken();
      if (!storedToken) {
        document.documentElement.classList.remove('dark');
        set({ isInitializing: false, isAuthenticated: false, user: null, token: null });
        return;
      }

      set({ token: storedToken });
      const { user } = await apiService.getMe();
      set({ user, isAuthenticated: true, isInitializing: false });
      useWallpaperStore.getState().setActiveContext(user._id);
    } catch {
      removeStoredToken();
      document.documentElement.classList.remove('dark');
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
      useWallpaperStore.getState().setActiveContext(null, null);
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiService.register(payload);
      // NOTE: Do not automatically log in or set authentication tokens upon registration.
      // The application requires explicit user login after successful registration.
      set({
        isLoading: false,
        isAuthModalOpen: false,
      });
      return {
        success: true,
        message: res.message || 'Account created successfully! Please log in to continue.',
        user: res.user,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiService.login(payload);
      if (typeof window !== 'undefined') {
        setStoredToken(res.token);
        const savedTheme = localStorage.getItem('chat_theme');
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
        isAuthModalOpen: false,
      });
      useWallpaperStore.getState().setActiveContext(res.user._id);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiService.logout();
    } catch {
      // Continue client cleanup even if backend is offline
    } finally {
      if (typeof window !== 'undefined') {
        removeStoredToken();
        document.documentElement.classList.remove('dark');
      }
      useWallpaperStore.getState().setActiveContext(null, null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isProfileModalOpen: false,
      });
    }
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiService.updateProfile(payload);
      set({ user: res.user, isLoading: false });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.changePassword(payload);
      set({ isLoading: false });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiService.resetPassword(payload);
      set({ isLoading: false });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  deleteAccount: async (password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiService.deleteAccount(password);
      if (typeof window !== 'undefined') {
        removeStoredToken();
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isProfileModalOpen: false,
      });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      set({ error: msg, isLoading: false });
      return { success: false, message: msg };
    }
  },

  setStatus: async (status: UserStatus) => {

    const currentUser = get().user;
    if (!currentUser) return;
    try {
      const res = await apiService.updateProfile({ status });
      set({ user: res.user });
    } catch {
      // Ignore background status failure
    }
  },
}));
