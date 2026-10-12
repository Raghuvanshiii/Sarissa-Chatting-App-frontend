import { create } from 'zustand';
import { Story, UserStoryGroup, CreateStoryData, StoryViewer, User, StoryDraft } from '../types';
import { apiService } from '../services/api';
import { useAuthStore } from './useAuthStore';

interface StoryState {
  myStories: Story[];
  otherStories: UserStoryGroup[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  // Story Viewer navigation state
  // activeGroupIndex: -1 represents viewing `myStories`, >= 0 represents index in `otherStories`
  activeGroupIndex: number | null;
  activeStoryIndex: number;
  isStoryViewerOpen: boolean;
  isCreateStoryOpen: boolean;

  // Viewers list state for author
  activeStoryViewers: StoryViewer[];
  isLoadingViewers: boolean;
  isViewersDrawerOpen: boolean;

  // Active story draft for live preview
  storyDraft: StoryDraft | null;
  setStoryDraft: (draft: StoryDraft | null) => void;

  // Actions
  fetchStories: () => Promise<void>;
  createStory: (data: CreateStoryData) => Promise<{ success: boolean; error?: string }>;
  deleteStory: (storyId: string) => Promise<{ success: boolean; error?: string }>;
  markStoryViewed: (storyId: string) => Promise<void>;
  fetchStoryViewers: (storyId: string) => Promise<void>;

  // Viewer controls
  openStoryViewer: (groupIndex: number, storyIndex?: number) => void;
  closeStoryViewer: () => void;
  nextStory: () => void;
  prevStory: () => void;
  setActiveStoryIndex: (index: number) => void;

  openCreateStory: () => void;
  closeCreateStory: () => void;

  openViewersDrawer: () => void;
  closeViewersDrawer: () => void;

  // Real-time synchronization
  handleStoryCreated: (story: Story) => void;
  handleStoryViewed: (data: { storyId: string; viewer: User; viewedAt: string; totalViews: number }) => void;
  handleStoryDeleted: (storyId: string) => void;
}

function deduplicateStoryViewers(story: Story): Story {
  if (!story.viewers || story.viewers.length <= 1) return story;
  const seen = new Set<string>();
  const uniqueViewers: StoryViewer[] = [];
  for (const v of story.viewers) {
    if (!v) continue;
    const uid = typeof v.user === 'object' && v.user ? String(v.user._id) : (v.user ? String(v.user) : null);
    if (uid && !seen.has(uid)) {
      seen.add(uid);
      uniqueViewers.push(v);
    }
  }
  return { ...story, viewers: uniqueViewers };
}

export const useStoryStore = create<StoryState>((set, get) => ({
  myStories: [],
  otherStories: [],
  isLoading: false,
  isCreating: false,
  error: null,

  activeGroupIndex: null,
  activeStoryIndex: 0,
  isStoryViewerOpen: false,
  isCreateStoryOpen: false,

  activeStoryViewers: [],
  isLoadingViewers: false,
  isViewersDrawerOpen: false,

  storyDraft: null,
  setStoryDraft: (draft) => set({ storyDraft: draft }),

  fetchStories: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiService.getActiveStories();
      if (res.success && res.data) {
        set({
          myStories: (res.data.myStories || []).map(deduplicateStoryViewers),
          otherStories: (res.data.otherStories || []).map((group: UserStoryGroup) => ({
            ...group,
            stories: (group.stories || []).map(deduplicateStoryViewers),
          })),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch stories';
      set({ isLoading: false, error: msg });
    }
  },

  createStory: async (data: CreateStoryData) => {
    try {
      set({ isCreating: true, error: null });
      const res = await apiService.createStory(data);
      if (res.success && res.data) {
        set((state) => ({
          myStories: [...state.myStories, res.data],
          isCreating: false,
          isCreateStoryOpen: false,
        }));
        return { success: true };
      }
      set({ isCreating: false });
      return { success: false, error: 'Failed to create story' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create story';
      set({ isCreating: false, error: msg });
      return { success: false, error: msg };
    }
  },

  deleteStory: async (storyId: string) => {
    try {
      const res = await apiService.deleteStory(storyId);
      if (res.success) {
        const state = get();
        const updatedMyStories = state.myStories.filter(
          (s) => String(s._id) !== String(storyId)
        );
        const updatedOtherStories = state.otherStories
          .map((group) => ({
            ...group,
            stories: group.stories.filter((s) => String(s._id) !== String(storyId)),
          }))
          .filter((group) => group.stories.length > 0);

        // If currently viewing my stories
        if (state.activeGroupIndex === -1) {
          if (updatedMyStories.length === 0) {
            set({
              myStories: updatedMyStories,
              otherStories: updatedOtherStories,
              isStoryViewerOpen: false,
              activeGroupIndex: null,
              activeStoryIndex: 0,
              isViewersDrawerOpen: false,
            });
          } else {
            const nextIdx = Math.min(state.activeStoryIndex, updatedMyStories.length - 1);
            set({
              myStories: updatedMyStories,
              otherStories: updatedOtherStories,
              activeStoryIndex: nextIdx,
              isViewersDrawerOpen: false,
            });
          }
        } else if (state.activeGroupIndex !== null) {
          // If viewing another user's stories group
          const currentGroup = updatedOtherStories[state.activeGroupIndex];
          if (!currentGroup || currentGroup.stories.length === 0) {
            set({
              myStories: updatedMyStories,
              otherStories: updatedOtherStories,
              isStoryViewerOpen: false,
              activeGroupIndex: null,
              activeStoryIndex: 0,
              isViewersDrawerOpen: false,
            });
          } else {
            const nextIdx = Math.min(state.activeStoryIndex, currentGroup.stories.length - 1);
            set({
              myStories: updatedMyStories,
              otherStories: updatedOtherStories,
              activeStoryIndex: nextIdx,
              isViewersDrawerOpen: false,
            });
          }
        } else {
          set({
            myStories: updatedMyStories,
            otherStories: updatedOtherStories,
          });
        }

        // Fetch fresh stories to keep UI in full synchronization
        get().fetchStories();

        return { success: true };
      }
      return { success: false, error: res.message || 'Failed to delete story' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete story';
      return { success: false, error: msg };
    }
  },

  markStoryViewed: async (storyId: string) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        set((state) => {
          const updatedOtherStories = state.otherStories.map((group) => {
            const updatedStories = group.stories.map((s) => {
              if (String(s._id) === String(storyId)) {
                const already = s.viewers.some((v) => {
                  const vid = typeof v.user === 'object' ? v.user._id : v.user;
                  return String(vid) === String(currentUser._id);
                });
                if (!already) {
                  return {
                    ...s,
                    viewers: [...s.viewers, { user: currentUser, viewedAt: new Date().toISOString() }],
                  };
                }
              }
              return s;
            });

            const groupHasUnviewed = updatedStories.some((s) => {
              return !s.viewers.some((v) => {
                const vid = typeof v.user === 'object' ? v.user._id : v.user;
                return String(vid) === String(currentUser._id);
              });
            });

            return {
              ...group,
              stories: updatedStories,
              hasUnviewed: groupHasUnviewed,
            };
          });

          return { otherStories: updatedOtherStories };
        });
      }

      await apiService.viewStory(storyId);
    } catch {
      // Background silent mark
    }
  },

  fetchStoryViewers: async (storyId: string) => {
    try {
      set({ isLoadingViewers: true });
      const res = await apiService.getStoryViewers(storyId);
      if (res.success && res.data) {
        const rawViewers = res.data.viewers || [];
        const seenIds = new Set<string>();
        const viewers: StoryViewer[] = [];
        for (const v of rawViewers) {
          if (!v) continue;
          const uid = typeof v.user === 'object' && v.user ? String(v.user._id) : (v.user ? String(v.user) : null);
          if (uid && !seenIds.has(uid)) {
            seenIds.add(uid);
            viewers.push(v);
          }
        }
        set((state) => {
          const updatedMyStories = state.myStories.map((s) => {
            if (String(s._id) === String(storyId)) {
              return { ...s, viewers };
            }
            return s;
          });
          return {
            activeStoryViewers: viewers,
            myStories: updatedMyStories,
            isLoadingViewers: false,
          };
        });
      } else {
        set({ isLoadingViewers: false });
      }
    } catch (err) {
      console.error('Failed to fetch story viewers:', err);
      // Keep existing viewers if any, do not destructively reset to empty
      set({ isLoadingViewers: false });
    }
  },

  openStoryViewer: (groupIndex: number, storyIndex = 0) => {
    set({
      activeGroupIndex: groupIndex,
      activeStoryIndex: storyIndex,
      isStoryViewerOpen: true,
      isViewersDrawerOpen: false,
      activeStoryViewers: [],
    });
  },

  closeStoryViewer: () => {
    set({
      isStoryViewerOpen: false,
      activeGroupIndex: null,
      activeStoryIndex: 0,
      isViewersDrawerOpen: false,
      activeStoryViewers: [],
    });
  },

  setActiveStoryIndex: (index: number) => {
    set({ activeStoryIndex: index, isViewersDrawerOpen: false });
  },

  nextStory: () => {
    const state = get();
    const { activeGroupIndex, activeStoryIndex, myStories, otherStories } = state;

    if (activeGroupIndex === null) return;

    // Viewing My Stories
    if (activeGroupIndex === -1) {
      if (activeStoryIndex < myStories.length - 1) {
        set({ activeStoryIndex: activeStoryIndex + 1, isViewersDrawerOpen: false });
      } else if (otherStories.length > 0) {
        // Move to first other user's story
        set({ activeGroupIndex: 0, activeStoryIndex: 0, isViewersDrawerOpen: false });
      } else {
        // No more stories, close
        state.closeStoryViewer();
      }
      return;
    }

    // Viewing another user's stories
    const currentGroup = otherStories[activeGroupIndex];
    if (!currentGroup) {
      state.closeStoryViewer();
      return;
    }

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      set({ activeStoryIndex: activeStoryIndex + 1, isViewersDrawerOpen: false });
    } else if (activeGroupIndex < otherStories.length - 1) {
      // Move to next user's story
      set({ activeGroupIndex: activeGroupIndex + 1, activeStoryIndex: 0, isViewersDrawerOpen: false });
    } else {
      // All stories completed, close viewer
      state.closeStoryViewer();
    }
  },

  prevStory: () => {
    const state = get();
    const { activeGroupIndex, activeStoryIndex, myStories, otherStories } = state;

    if (activeGroupIndex === null) return;

    // Viewing My Stories
    if (activeGroupIndex === -1) {
      if (activeStoryIndex > 0) {
        set({ activeStoryIndex: activeStoryIndex - 1, isViewersDrawerOpen: false });
      }
      return;
    }

    // Viewing another user's stories
    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1, isViewersDrawerOpen: false });
    } else if (activeGroupIndex > 0) {
      // Move to previous user's last story
      const prevGroup = otherStories[activeGroupIndex - 1];
      set({
        activeGroupIndex: activeGroupIndex - 1,
        activeStoryIndex: Math.max(0, prevGroup.stories.length - 1),
        isViewersDrawerOpen: false,
      });
    } else if (myStories.length > 0) {
      // Go back to my last story
      set({
        activeGroupIndex: -1,
        activeStoryIndex: myStories.length - 1,
        isViewersDrawerOpen: false,
      });
    }
  },

  openCreateStory: () => {
    set({ isCreateStoryOpen: true });
  },

  closeCreateStory: () => {
    set({ isCreateStoryOpen: false });
  },

  openViewersDrawer: () => {
    set({ isViewersDrawerOpen: true });
  },

  closeViewersDrawer: () => {
    set({ isViewersDrawerOpen: false });
  },

  // Real-time synchronization handlers
  handleStoryCreated: (story: Story) => {
    const state = get();
    // Refresh active stories or insert into group
    state.fetchStories();
  },

  handleStoryViewed: (data) => {
    set((state) => {
      // If currently viewing my stories, update viewers count
      const updatedMyStories = state.myStories.map((s) => {
        if (String(s._id) === String(data.storyId)) {
          const alreadyIn = s.viewers.some((v) => {
            const vUserId = typeof v.user === 'object' && v.user ? String(v.user._id) : (v.user ? String(v.user) : null);
            return String(vUserId) === String(data.viewer._id);
          });
          if (!alreadyIn) {
            return {
              ...s,
              viewers: [...s.viewers, { user: data.viewer, viewedAt: data.viewedAt }],
            };
          }
        }
        return s;
      });

      // Also update activeStoryViewers in real-time if drawer is open or viewing this story
      let updatedActiveViewers = state.activeStoryViewers;
      const isViewingThisStory =
        state.isStoryViewerOpen &&
        state.activeGroupIndex === -1 &&
        state.activeStoryIndex !== null &&
        state.myStories[state.activeStoryIndex] &&
        String(state.myStories[state.activeStoryIndex]._id) === String(data.storyId);

      if (isViewingThisStory || state.isViewersDrawerOpen) {
        const alreadyInActive = state.activeStoryViewers.some((v) => {
          const vUserId = typeof v.user === 'object' && v.user ? String(v.user._id) : (v.user ? String(v.user) : null);
          return String(vUserId) === String(data.viewer._id);
        });
        if (!alreadyInActive) {
          updatedActiveViewers = [
            ...state.activeStoryViewers,
            { user: data.viewer, viewedAt: data.viewedAt },
          ];
        }
      }

      return {
        myStories: updatedMyStories,
        activeStoryViewers: updatedActiveViewers,
      };
    });
  },

  handleStoryDeleted: (storyId: string) => {
    const state = get();
    const updatedMyStories = state.myStories.filter(
      (s) => String(s._id) !== String(storyId)
    );
    const updatedOtherStories = state.otherStories
      .map((group) => ({
        ...group,
        stories: group.stories.filter((s) => String(s._id) !== String(storyId)),
      }))
      .filter((group) => group.stories.length > 0);

    // If story viewer is open, safely adjust indices or close if empty
    if (state.isStoryViewerOpen) {
      if (state.activeGroupIndex === -1) {
        if (updatedMyStories.length === 0) {
          set({
            myStories: updatedMyStories,
            otherStories: updatedOtherStories,
            isStoryViewerOpen: false,
            activeGroupIndex: null,
            activeStoryIndex: 0,
            isViewersDrawerOpen: false,
          });
        } else {
          const nextIdx = Math.min(state.activeStoryIndex, updatedMyStories.length - 1);
          set({
            myStories: updatedMyStories,
            otherStories: updatedOtherStories,
            activeStoryIndex: nextIdx,
            isViewersDrawerOpen: false,
          });
        }
      } else if (state.activeGroupIndex !== null) {
        const currentGroup = updatedOtherStories[state.activeGroupIndex];
        if (!currentGroup || currentGroup.stories.length === 0) {
          set({
            myStories: updatedMyStories,
            otherStories: updatedOtherStories,
            isStoryViewerOpen: false,
            activeGroupIndex: null,
            activeStoryIndex: 0,
            isViewersDrawerOpen: false,
          });
        } else {
          const nextIdx = Math.min(state.activeStoryIndex, currentGroup.stories.length - 1);
          set({
            myStories: updatedMyStories,
            otherStories: updatedOtherStories,
            activeStoryIndex: nextIdx,
            isViewersDrawerOpen: false,
          });
        }
      } else {
        set({
          myStories: updatedMyStories,
          otherStories: updatedOtherStories,
        });
      }
    } else {
      set({
        myStories: updatedMyStories,
        otherStories: updatedOtherStories,
      });
    }

    state.fetchStories();
  },
}));
