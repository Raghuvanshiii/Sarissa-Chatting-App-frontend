'use client';

import React from 'react';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  CircleDot, 
  User as UserIcon,
  Plus
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { getMediaUrl } from '../../utils/media';

/**
 * Mobile Bottom Navigation Bar
 * Rendered on mobile viewports (< 768px) when no conversation is actively open.
 * Provides touch-friendly, native app-like tab navigation conforming to the Sarissa aesthetic.
 */
export const MobileNavigation: React.FC = () => {
  const { currentNavTab, setCurrentNavTab } = useAppStore();
  const { user, openProfileModal } = useAuthStore();
  const { conversations, openNewChatModal } = useChatStore();

  const totalUnreadCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  const activeTab = currentNavTab || 'chats';

  const handleTabClick = (tabId: string) => {
    if (tabId === 'stories') {
      useChatStore.getState().setActiveConversation(null);
    }
    if (typeof setCurrentNavTab === 'function') {
      setCurrentNavTab(tabId);
    } else {
      useAppStore.setState({ currentNavTab: tabId });
    }
  };

  const navItems = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
      onClick: () => handleTabClick('chats'),
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      onClick: () => handleTabClick('contacts'),
    },
    {
      id: 'calls',
      label: 'Calls',
      icon: Phone,
      onClick: () => handleTabClick('calls'),
    },
    {
      id: 'stories',
      label: 'Stories',
      icon: CircleDot,
      onClick: () => handleTabClick('stories'),
    },
    {
      id: 'profile',
      label: 'Profile',
      isAvatar: true,
      onClick: openProfileModal,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden flex-shrink-0 w-full bg-[#FFF0F3]/95 backdrop-blur-md border-t border-[#F7CAD0] px-3 py-1.5 z-30 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all cursor-pointer min-w-[56px] relative active:scale-95 ${
                isActive
                  ? 'text-[#C24A68] font-bold'
                  : 'text-[#9A707E] hover:text-[#7D2338]'
              }`}
            >
              <div className="relative">
                {item.isAvatar ? (
                  user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(user.avatar)}
                      alt={user.fullName || 'User'}
                      className={`w-6 h-6 rounded-full object-cover transition-all ${
                        isActive ? 'ring-2 ring-[#C24A68]' : 'ring-1 ring-[#F7CAD0]'
                      }`}
                    />
                  ) : (
                    <div className={`w-6 h-6 rounded-full bg-[#FCE7EC] text-[#C24A68] text-[10px] font-bold flex items-center justify-center font-handwriting ${
                      isActive ? 'ring-2 ring-[#C24A68]' : ''
                    }`}>
                      {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'ME'}
                    </div>
                  )
                ) : Icon ? (
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                ) : null}

                {/* Unread Message Pill Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#E05375] text-white text-[10px] font-bold flex items-center justify-center font-sans shadow-2xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] font-cute mt-0.5 tracking-tight ${
                isActive ? 'font-bold text-[#C24A68]' : 'font-medium text-[#9A707E]'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
