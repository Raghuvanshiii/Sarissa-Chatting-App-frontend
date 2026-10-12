'use client';

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  MessageSquare, 
  Moon, 
  Sun, 
  LogIn,
  UserPlus,
  ChevronDown
} from 'lucide-react';

import { SarissaLogoIcon } from '../auth/SarissaLogo';

export const Navbar: React.FC = () => {
  const { 
    theme, 
    toggleTheme 
  } = useAppStore();

  const {
    user,
    isAuthenticated,
    openAuthModal,
    openProfileModal,
  } = useAuthStore();

  return (
    <header className="h-16 border-b border-white/90 bg-white/80 backdrop-blur-2xl sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between shadow-[0_4px_24px_rgba(0,110,210,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] transition-colors">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        {/* Realistic 3D Sarissa Brand Logo */}
        <SarissaLogoIcon size={36} />
        <div>
          <h1 className="text-base font-bold tracking-tight text-[#144272]">
            Sarissa
          </h1>
          <p className="text-xs text-[#52789C] font-medium hidden sm:block">
            Real-Time Messaging
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* User Auth Section */}
        {isAuthenticated && user ? (
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1 rounded-full bg-white/75 hover:bg-white border border-[#CCE5F5] hover:border-[#0284C7]/50 shadow-xs transition group cursor-pointer"
          >
            {/* 3D Water Orb User Avatar */}
            <div className="relative">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={user.avatar} 
                  alt={user.fullName} 
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-xs" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#38BDF8] via-[#0284C7] to-[#0369A1] p-[1px] ring-2 ring-white shadow-xs flex items-center justify-center text-white text-[12px] font-bold">
                  {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'US'}
                </div>
              )}
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_4px_#10B981]' : user.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
              }`} />
            </div>
            <div className="text-left hidden lg:block">
              <span className="block text-xs font-bold text-[#144272] group-hover:text-[#0284C7] transition-colors leading-tight">
                {user.fullName}
              </span>
              <span className="block text-[11px] text-[#52789C] font-mono leading-none">
                @{user.username}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#52789C] group-hover:text-[#144272] transition" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#144272] hover:bg-white/80 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0093E9] to-[#0284C7] text-white shadow-md hover:brightness-105 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl text-[#52789C] hover:text-[#144272] bg-white/60 hover:bg-white border border-[#BDE0F5] transition cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#0284C7]" />}
        </button>
      </div>
    </header>
  );
};
