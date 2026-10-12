'use client';

import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AtSign, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalTab, 
    openAuthModal, 
    login, 
    register, 
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleTabSwitch = (tab: 'login' | 'register') => {
    clearError();
    setLocalValidationError(null);
    setLocalSuccessMessage(null);
    openAuthModal(tab);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setLocalValidationError('Please enter both email and password');
      return;
    }

    await login({ email: loginEmail.trim(), password: loginPassword });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);

    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setLocalValidationError('All fields are required');
      return;
    }

    if (regPassword.length < 6) {
      setLocalValidationError('Password must be at least 6 characters long');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setLocalValidationError('Passwords do not match');
      return;
    }

    const res = await register({
      fullName: regFullName.trim(),
      username: regUsername.trim().toLowerCase(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });

    if (res.success) {
      setLocalSuccessMessage(res.message || 'Account created successfully! Please sign in.');
      setLoginEmail(regUsername.trim().toLowerCase());
      setRegFullName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      openAuthModal('login');
    }
  };

  const handleQuickDemoFill = () => {
    setLocalValidationError(null);
    clearError();
    const randomId = Math.floor(1000 + Math.random() * 9000);
    if (authModalTab === 'register') {
      setRegFullName('Alex Demo');
      setRegUsername(`alex_${randomId}`);
      setRegEmail(`alex_${randomId}@sarissa.dev`);
      setRegPassword('Password123!');
      setRegConfirmPassword('Password123!');
    } else {
      setLoginEmail('alex_1234@sarissa.dev');
      setLoginPassword('Password123!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-[#A23B5A] via-[#C24A68] to-[#E07A93] text-white">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-white/20 border border-white/30 text-white">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-100">
              JWT Authentication
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {authModalTab === 'login' ? 'Welcome Back to Sarissa' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-rose-100/90 mt-1">
            {authModalTab === 'login' 
              ? 'Enter your credentials to continue your conversations' 
              : 'Join Sarissa and start your journey of meaningful conversations'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#F5BAC6] bg-[#FFEBF0]/60">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-3 text-xs font-semibold text-center transition cursor-pointer ${
              authModalTab === 'login'
                ? 'text-[#C24A68] border-b-2 border-[#C24A68] bg-[#FFF5F7] font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex-1 py-3 text-xs font-semibold text-center transition cursor-pointer ${
              authModalTab === 'register'
                ? 'text-[#C24A68] border-b-2 border-[#C24A68] bg-[#FFF5F7] font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4">
          {/* Success Banner */}
          {localSuccessMessage && authModalTab === 'login' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{localSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {(error || localValidationError) && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#C24A68] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localValidationError || error}</span>
            </div>
          )}

          {authModalTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#2D151D] mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email or Username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2D151D] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-semibold text-xs shadow-md shadow-[#C24A68]/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#2D151D] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2D151D] mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="johndoe"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2D151D] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#2D151D] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2D151D] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FFF0F3] border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]/60 transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-semibold text-xs shadow-md shadow-[#C24A68]/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
