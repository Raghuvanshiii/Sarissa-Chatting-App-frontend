'use client';

import React, { useEffect } from 'react';
import { NavigationRail } from '../components/layout/NavigationRail';
import { Sidebar } from '../components/layout/Sidebar';
import { FriendsPage } from '../components/friends/FriendsPage';
import { CallsPage } from '../components/calls/CallsPage';
import { StoriesPage } from '../components/story/StoriesPage';
import { ChatAreaShell } from '../components/chat/ChatAreaShell';
import { DetailsPanel } from '../components/layout/DetailsPanel';
import { AuthModal } from '../components/auth/AuthModal';
import { ProfileModal } from '../components/profile/ProfileModal';
import { NewChatModal } from '../components/conversation/NewChatModal';
import { CreateGroupModal } from '../components/conversation/CreateGroupModal';
import { GroupInfoDrawer } from '../components/conversation/GroupInfoDrawer';
import { StoryViewerModal } from '../components/story/StoryViewerModal';
import { StoryCreatorModal } from '../components/story/StoryCreatorModal';
import { ChatWallpaperModal } from '../components/chat/ChatWallpaperModal';
import { AquaAuthScreen } from '../components/auth/AquaAuthScreen';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useStoryStore } from '../store/useStoryStore';

export default function Home() {
  const { 
    setSocketStatus, 
    setServerHealth, 
    addSocketLog,
    initTheme,
    currentNavTab,
  } = useAppStore();

  const { token, isAuthenticated, user, isInitializing, initAuth } = useAuthStore();
  const { 
    activeConversation,
    receiveMessage, 
    updateMessageContent, 
    handleConversationCreated,
    handleConversationUpdated,
    handleConversationRemoved 
  } = useChatStore();

  // 1. Initialize Auth on page load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Clean up any residual chat theme variables or wallpaper DOM attributes from prior sessions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById('sarissa-theme-variables') || document.getElementById('sambandh-theme-variables');
      if (el) el.remove();
      document.documentElement.removeAttribute('data-chat-theme');
      document.documentElement.removeAttribute('data-chat-wallpaper');
      try {
        localStorage.removeItem('sarissa_chat_theme_id');
        localStorage.removeItem('sarissa_custom_themes');
        localStorage.removeItem('sarissa_chat_wallpaper');
        localStorage.removeItem('sambandh_chat_theme_id');
        localStorage.removeItem('sambandh_custom_themes');
        localStorage.removeItem('sambandh_chat_wallpaper');
      } catch {}
    }
  }, []);

  // 2. Synchronize theme & stories ONLY when user is authenticated (after login)
  useEffect(() => {
    if (isAuthenticated && token && user) {
      initTheme();
      useStoryStore.getState().fetchStories();
    } else if (!isInitializing) {
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isAuthenticated, token, user, isInitializing, initTheme]);

  // 2. Fetch server health silently in background
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const data = await apiService.getHealth();
        setServerHealth(data);
        addSocketLog('api:health_check_ok', data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'API offline or unreachable';
        addSocketLog('api:health_check_failed', { error: msg });
      }
    };
    checkServerHealth();
  }, [setServerHealth, addSocketLog]);

  // 3. Manage Socket.IO connection and real-time message stream in background
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const unsubscribeState = socketService.onStateChange((state) => {
      setSocketStatus(state);
      addSocketLog('socket:state_changed', { state });
    });

    const socket = socketService.connect(token);

    socket.on('system:connected', (data) => {
      addSocketLog('socket:system_connected', data);
    });

    // Listen for incoming real-time messages
    const unsubscribeMessage = socketService.onNewMessage((message) => {
      addSocketLog('socket:message_received', {
        id: message._id,
        sender: typeof message.senderId === 'object' ? message.senderId.username : 'user',
        preview: message.content.slice(0, 30),
      });
      receiveMessage(message);
    });

    // Listen for real-time poll vote updates
    const unsubscribePoll = socketService.onPollUpdated((data) => {
      addSocketLog('socket:poll_updated', {
        messageId: data.messageId,
        conversationId: data.conversationId,
      });
      updateMessageContent(data.conversationId, data.messageId, data.content);
    });

    // Listen for real-time group/conversation creations
    const unsubscribeConversation = socketService.onConversationCreated((conversation) => {
      addSocketLog('socket:conversation_created', {
        id: conversation._id,
        name: conversation.name,
      });
      handleConversationCreated(conversation);
    });

    // Listen for real-time group/conversation updates
    const unsubscribeConvUpdated = socketService.onConversationUpdated((conversation) => {
      addSocketLog('socket:conversation_updated', {
        id: conversation._id,
        name: conversation.name,
      });
      handleConversationUpdated(conversation);
    });

    // Listen for real-time member removal from conversation
    const unsubscribeConvRemoved = socketService.onConversationRemoved((data) => {
      addSocketLog('socket:conversation_removed', data);
      handleConversationRemoved(data.conversationId);
    });

    // Listen for real-time story creation, viewing, and deletion
    const unsubscribeStoryCreated = socketService.onStoryCreated((data) => {
      useStoryStore.getState().handleStoryCreated(data.story);
    });

    const unsubscribeStoryViewed = socketService.onStoryViewed((data) => {
      useStoryStore.getState().handleStoryViewed(data);
    });

    const unsubscribeStoryDeleted = socketService.onStoryDeleted((data) => {
      useStoryStore.getState().handleStoryDeleted(data.storyId);
    });

    const unsubscribeProfileUpdated = socketService.onUserProfileUpdated((data) => {
      if (data?.user) {
        useChatStore.getState().handleUserUpdated(data.user);
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeMessage();
      unsubscribePoll();
      unsubscribeConversation();
      unsubscribeConvUpdated();
      unsubscribeConvRemoved();
      unsubscribeStoryCreated();
      unsubscribeStoryViewed();
      unsubscribeStoryDeleted();
      unsubscribeProfileUpdated();
      socket.off('system:connected');
    };
  }, [
    token, 
    isAuthenticated, 
    setSocketStatus, 
    addSocketLog, 
    receiveMessage, 
    updateMessageContent, 
    handleConversationCreated,
    handleConversationUpdated,
    handleConversationRemoved
  ]);

  // If auth is still checking saved session, show elegant warm splash loader
  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#181816] text-[#1C1B18] dark:text-[#F4F2EC] select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#E5EFE5] dark:bg-[#242E25] border border-[#D0DFD0] dark:border-[#384B3B] flex items-center justify-center text-[#3D5A45] dark:text-[#8EB897] shadow-2xs animate-pulse">
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current"
          >
            <path d="M4 10V14" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M8 7V17" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M12 4V20" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M16 8V16" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M20 11V13" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="mt-3.5 text-xs font-serif text-[#7A7870] dark:text-[#AAA89F] tracking-wide">loading Sarissa...</p>
      </div>
    );
  }

  // If user is unauthenticated, render the Login/Register interface
  if (!isAuthenticated || !token || !user) {
    return <AquaAuthScreen />;
  }

  // Sarissa messaging workspace
  return (
    <div
      data-chat-workspace
      className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex bg-[#FAF8F5] dark:bg-[#181816] text-[#1C1B18] dark:text-[#F4F2EC] overflow-hidden select-none"
    >
      {/* 1. Far-left App Rail (Hidden on mobile <768px, visible on tablet & desktop >=768px) */}
      <NavigationRail />

      {/* 2. Conversations / Contacts / Calls / Stories Column */}
      {/* Mobile (<768px): Full width when no chat active, hidden when chat active */}
      {/* Tablet/Desktop (>=768px): Multi-column left sidebar with flexible clamp width */}
      <div className={`h-full w-full md:w-[clamp(19rem,28vw,23rem)] md:min-w-[19rem] md:max-w-[23rem] flex-shrink-0 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {currentNavTab === 'contacts' ? (
          <FriendsPage />
        ) : currentNavTab === 'calls' ? (
          <CallsPage />
        ) : currentNavTab === 'stories' ? (
          <StoriesPage />
        ) : (
          <Sidebar />
        )}
      </div>

      {/* 3. Center Main Chat Area */}
      {/* Mobile (<768px): Full width when chat active, hidden when no chat active */}
      {/* Tablet/Desktop (>=768px): Multi-column main chat filling remaining space */}
      <div className={`h-full flex-1 min-w-0 ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
        <ChatAreaShell />
      </div>

      {/* 4. Right Conversation Info Drawer */}
      <DetailsPanel />

      {/* Interactive Modals */}
      <div data-chat-modal>
        <AuthModal />
        <ProfileModal />
        <NewChatModal />
        <CreateGroupModal />
        <GroupInfoDrawer />
        <StoryViewerModal />
        <StoryCreatorModal />
        <ChatWallpaperModal />
      </div>
    </div>
  );
}
