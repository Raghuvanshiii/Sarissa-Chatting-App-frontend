'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  User as UserIcon,
  Phone,
  Plus,
  CircleDot,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useAppStore } from '../../store/useAppStore';
import { getMediaUrl } from '../../utils/media';

interface NavigationRailProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

/**
 * High-fidelity Sarissa brand logo mark
 * Clean, iconic emblem matching the luxury aesthetic in Attachment 1 & 2
 */
const SarissaLogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="sarissaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E1E26" />
        <stop offset="100%" stopColor="#12131A" />
      </linearGradient>
      <linearGradient id="sarissaGem" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4D6D" />
        <stop offset="100%" stopColor="#C9184A" />
      </linearGradient>
    </defs>
    {/* Sleek rounded squircle base */}
    <rect width="36" height="36" rx="10" fill="url(#sarissaGrad)" />
    {/* Stylized geometric lettermark "S" with heart arch */}
    <path
      d="M23.5 12C23.5 10 21.5 8.5 18 8.5C14 8.5 12 10.2 12 12.5C12 15.2 14.2 16.2 18 17.2C21.8 18.2 24 19.8 24 22.8C24 25.8 21.5 27.5 18 27.5C13.5 27.5 11.5 25 11.5 23.2"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Subtle heart ruby gem dot */}
    <circle cx="23.5" cy="10.5" r="2.2" fill="url(#sarissaGem)" />
  </svg>
);

export const NavigationRail: React.FC<NavigationRailProps> = ({
  onSelectTab,
}) => {
  const { user, openProfileModal, logout } = useAuthStore();
  const { openNewChatModal, conversations } = useChatStore();
  const { currentNavTab, setCurrentNavTab } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [notchTop, setNotchTop] = useState<number>(0);
  const [notchHeight, setNotchHeight] = useState<number>(52);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute unread messages count for badge
  const totalUnreadCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  );

  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    };
  }, []);

  const handleNavClick = (tabId: string) => {
    if (tabId === 'stories') {
      useChatStore.getState().setActiveConversation(null);
    }

    if (typeof setCurrentNavTab === 'function') {
      setCurrentNavTab(tabId);
    } else {
      useAppStore.setState({ currentNavTab: tabId });
    }
    onSelectTab?.(tabId);
  };

  // Nav item definitions strictly using the icons present in current navigation bar
  const navItems = [
    {
      id: 'new-chat',
      label: 'NEW CHAT',
      icon: Plus,
      color: '#E11D48', // Vibrant crimson
      onClick: openNewChatModal,
    },
    {
      id: 'chats',
      label: 'CHATS',
      icon: MessageSquare,
      color: '#10B981', // Emerald green matching Attachment 3 INBOX
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
      onClick: () => handleNavClick('chats'),
    },
    {
      id: 'contacts',
      label: 'CONTACTS',
      icon: UserIcon,
      color: '#F59E0B', // Warm amber matching Attachment 2 & 3 PROFILE
      onClick: () => handleNavClick('contacts'),
    },
    {
      id: 'calls',
      label: 'CALLS',
      icon: Phone,
      color: '#8B5CF6', // Royal purple matching Attachment 3 ORDER
      onClick: () => handleNavClick('calls'),
    },
    {
      id: 'stories',
      label: 'STORY',
      icon: CircleDot,
      color: '#EC4899', // Pink rose
      onClick: () => handleNavClick('stories'),
    },
    {
      id: 'profile',
      label: user?.fullName ? user.fullName.toUpperCase() : 'PROFILE',
      isAvatar: true,
      color: '#F59E0B',
      onClick: openProfileModal,
    },
    {
      id: 'logout',
      label: 'LOGOUT',
      icon: LogOut,
      color: '#EF4444', // Red matching Attachment 1 & 3 HOME
      onClick: async () => {
        await logout();
      },
    },
  ];

  // The active tab when not hovering over another item
  const activeTabId = currentNavTab || 'chats';
  const targetId = hoveredId || activeTabId;

  // Measure and align the curved notch to the target item
  const updateNotchPosition = useCallback((id: string) => {
    const el = itemRefs.current[id];
    if (el) {
      setNotchTop(el.offsetTop);
      setNotchHeight(el.offsetHeight);
    }
  }, []);

  useEffect(() => {
    updateNotchPosition(targetId);
  }, [targetId, isExpanded, updateNotchPosition]);

  useEffect(() => {
    const handleResize = () => {
      updateNotchPosition(targetId);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetId, updateNotchPosition]);

  const handleItemHover = (id: string) => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    setHoveredId(id);
    setIsExpanded(true);
  };

  const handleLogoHover = () => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    setIsExpanded(true);
  };

  const handleMouseLeaveNav = () => {
    expandTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setHoveredId(null);
    }, 60);
  };

  // Currently focused item data for indicator
  const currentItem = navItems.find((item) => item.id === targetId) || navItems[1];
  const activeColor = currentItem.color;
  const ActiveIcon = currentItem.icon;
  const activeLabel = currentItem.label;
  const activeBadge = currentItem.badge;
  const isTargetAvatar = currentItem.isAvatar;

  return (
    <aside
      className={`hidden md:flex h-full min-h-0 bg-[#12131A] text-white flex-col select-none z-30 flex-shrink-0 relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] p-2 sm:p-2.5 ${
        isExpanded ? 'w-[220px] lg:w-[254px]' : 'w-[76px] lg:w-[84px]'
      }`}
      onMouseEnter={() => {
        if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      }}
      onMouseLeave={handleMouseLeaveNav}
    >
        {/* Inner Berry Pink Navigation Bar Card matching Attachment 2 */}
        <div className="w-full h-full bg-gradient-to-b from-[#80324B] via-[#85344D] to-[#8C3752] rounded-[26px] shadow-2xl flex flex-col justify-between py-3 overflow-hidden relative border border-white/15">
          
          {/* Top Brand Logo Section */}
          <div
            onMouseEnter={handleLogoHover}
            onClick={() => handleNavClick('chats')}
            className="w-full pt-1.5 pb-2.5 px-2 flex items-center cursor-pointer group shrink-0"
            title="Sarissa"
          >
            <div className="ml-1 w-11 h-11 flex items-center justify-center shrink-0">
              <SarissaLogoMark size={32} />
            </div>

            {/* Brand Title revealed on hover expansion */}
            <div
              className={`ml-3.5 flex items-center overflow-hidden whitespace-nowrap transition-all duration-200 ${
                isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
              }`}
            >
              <span className="font-cute font-extrabold text-[16px] tracking-[0.14em] text-white leading-none">
                SARISSA
              </span>
            </div>
          </div>

          {/* Nav Items Container hosting the animated sliding curved notch */}
          <div ref={containerRef} className="relative w-full flex-1 flex flex-col justify-between py-1">
            
            {/* Signature Sliding Curved Cutout Notch from Attachments 1, 2 & 3 */}
            <div
              className="absolute left-1 right-0 rounded-l-full bg-[#12131A] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none z-10 flex items-center"
              style={{
                transform: `translateY(${notchTop}px)`,
                height: `${notchHeight}px`,
                top: 0,
              }}
            >
              {/* Top Concave Fillet Curve */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-0 bottom-full pointer-events-none"
                style={{ marginBottom: '-0.5px' }}
              >
                <path
                  d="M 20 0 L 20 20 L 0 20 A 20 20 0 0 0 20 0 Z"
                  fill="#12131A"
                />
              </svg>

              {/* Bottom Concave Fillet Curve (Identical Symmetrical Mirror of Top Curve) */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-0 top-full pointer-events-none"
                style={{ marginTop: '-0.5px' }}
              >
                <path
                  d="M 20 20 L 20 0 L 0 0 A 20 20 0 0 1 20 20 Z"
                  fill="#12131A"
                />
              </svg>

              {/* Glowing Vibrant Circular Bulb Indicator */}
              <div
                className="ml-1.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white transition-all duration-300 transform scale-100"
                style={{
                  backgroundColor: activeColor,
                  boxShadow: `0 4px 14px ${activeColor}66`,
                }}
              >
                {isTargetAvatar ? (
                  user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(user.avatar)}
                      alt={user.fullName || 'User'}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white/40 font-handwriting">
                      {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'ME'}
                    </div>
                  )
                ) : ActiveIcon ? (
                  <ActiveIcon className="w-5 h-5 stroke-[2.2]" />
                ) : null}
              </div>

              {/* Label rendered inside dark notch when expanded */}
              <div
                className={`ml-3.5 pr-3 flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                  isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <span
                  className="font-cute font-bold text-xs tracking-wider truncate"
                  style={{ color: activeColor }}
                >
                  {activeLabel}
                </span>
                {activeBadge !== undefined && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center font-sans shadow-xs shrink-0">
                    {activeBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Main Upper Navigation Options */}
            <div className="flex flex-col gap-1 w-full">
              {navItems.slice(0, 5).map((item) => {
                const isTarget = targetId === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    onMouseEnter={() => handleItemHover(item.id)}
                    onClick={item.onClick}
                    className="relative z-20 w-full h-[50px] flex items-center rounded-l-full transition-colors cursor-pointer select-none group text-left"
                    title={item.label}
                  >
                    {/* Icon Column */}
                    <div className="ml-1.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0">
                      {!isTarget && Icon && (
                        <div className="relative">
                          <Icon className="w-5 h-5 stroke-[2] text-[#F7CAD8] group-hover:text-white transition-colors" />
                          {item.badge !== undefined && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#82324B]" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Label */}
                    <div
                      className={`ml-3.5 pr-3 flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                        isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                      }`}
                    >
                      {!isTarget && (
                        <>
                          <span className="font-cute font-bold text-xs tracking-wider text-[#F7CAD8] group-hover:text-white truncate transition-colors">
                            {item.label}
                          </span>
                          {item.badge !== undefined && (
                            <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[11px] font-bold flex items-center justify-center font-sans shadow-xs shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Options: User Profile Picture, Logout */}
            <div className="flex flex-col gap-1 w-full pt-2 border-t border-white/15">
              {navItems.slice(5).map((item) => {
                const isTarget = targetId === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    onMouseEnter={() => handleItemHover(item.id)}
                    onClick={item.onClick}
                    className="relative z-20 w-full h-[50px] flex items-center rounded-l-full transition-colors cursor-pointer select-none group text-left"
                    title={item.label}
                  >
                    {/* Icon Column */}
                    <div className="ml-1.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0">
                      {!isTarget && (
                        item.isAvatar ? (
                          user?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getMediaUrl(user.avatar)}
                              alt={user.fullName || 'User'}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/40"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-white/15 text-white font-bold text-xs flex items-center justify-center ring-1 ring-white/30 font-handwriting">
                              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'ME'}
                            </div>
                          )
                        ) : Icon ? (
                          <Icon className="w-5 h-5 stroke-[2] text-[#F7CAD8] group-hover:text-white transition-colors" />
                        ) : null
                      )}
                    </div>

                    {/* Expanded Label */}
                    <div
                      className={`ml-3.5 pr-3 flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                        isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                      }`}
                    >
                      {!isTarget && (
                        <span className="font-cute font-bold text-xs tracking-wider text-[#F7CAD8] group-hover:text-white truncate transition-colors">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
  );
};
