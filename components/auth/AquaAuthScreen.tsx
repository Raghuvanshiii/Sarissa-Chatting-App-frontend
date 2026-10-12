'use client';

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  AlertCircle, 
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { HoneycombTopRight, HoneycombBottomLeft } from './HoneycombWatermark';
import { GoogleIcon, AppleIcon, GithubIcon } from './SocialIcons';

export const AquaAuthScreen: React.FC = () => {
  const { login, register, resetPassword, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailAddressInput, setEmailAddressInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // Local Feedback Messages
  const [validationError, setValidationError] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [registrationBannerMessage, setRegistrationBannerMessage] = useState<string | null>(null);

  // Load remember me & saved email preference on mount, lock UI to light mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      const savedRemember = localStorage.getItem('sarissa_remember_me') ?? localStorage.getItem('sambandh_remember_me');
      if (savedRemember !== null) {
        setRememberMe(savedRemember === 'true');
      }
      const savedEmail = localStorage.getItem('sarissa_saved_email') ?? localStorage.getItem('sambandh_saved_email');
      if (savedEmail) {
        setEmailOrUsername(savedEmail);
      }
    }
  }, []);

  const handleModeSwitch = (newMode: 'login' | 'register' | 'forgot') => {
    clearError();
    setValidationError(null);
    setSocialMessage(null);
    setResetSuccessMessage(null);
    setRegistrationBannerMessage(null);
    setMode(newMode);
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (newMode === 'register') {
      setFullNameInput('');
      setUsernameInput('');
      setEmailAddressInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
    } else if (newMode === 'forgot') {
      setPasswordInput('');
      setConfirmPasswordInput('');
    } else {
      setPasswordInput('');
    }
  };

  const handleSocialClick = (provider: string) => {
    setSocialMessage(`${provider} login will be connected soon!`);
    setTimeout(() => {
      setSocialMessage(null);
    }, 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setResetSuccessMessage(null);
    setSocialMessage(null);

    if (mode === 'login') {
      if (!emailOrUsername.trim()) {
        setValidationError('Please enter your email or username');
        return;
      }
      if (!passwordInput) {
        setValidationError('Please enter your password');
        return;
      }

      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('sarissa_remember_me', 'true');
        localStorage.setItem('sarissa_saved_email', emailOrUsername.trim());
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('sarissa_saved_email');
        localStorage.removeItem('sambandh_saved_email');
        localStorage.setItem('sarissa_remember_me', 'false');
      }

      await login({
        email: emailOrUsername.trim(),
        password: passwordInput,
      });

    } else if (mode === 'register') {
      if (!fullNameInput.trim()) {
        setValidationError('Please enter your full name');
        return;
      }
      if (!emailAddressInput.trim()) {
        setValidationError('Please enter your email address');
        return;
      }
      if (!usernameInput.trim()) {
        setValidationError('Please choose a username');
        return;
      }
      if (!passwordInput) {
        setValidationError('Please enter a password');
        return;
      }
      if (passwordInput.length < 6) {
        setValidationError('Password must be at least 6 characters');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setValidationError('Passwords do not match');
        return;
      }

      const cleanUsername = usernameInput.trim().toLowerCase();
      const cleanEmail = emailAddressInput.trim().toLowerCase();

      const res = await register({
        fullName: fullNameInput.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: passwordInput,
        confirmPassword: confirmPasswordInput,
      });

      if (res.success) {
        setPasswordInput('');
        setConfirmPasswordInput('');
        setFullNameInput('');
        setUsernameInput('');
        setEmailAddressInput('');
        setEmailOrUsername(cleanUsername || cleanEmail);
        setMode('login');

        setRegistrationBannerMessage(
          `Account created for @${cleanUsername}! Sign in to get started.`
        );
      }

    } else if (mode === 'forgot') {
      if (!emailOrUsername.trim()) {
        setValidationError('Please enter your email or username');
        return;
      }
      if (!passwordInput || passwordInput.length < 6) {
        setValidationError('New password must be at least 6 characters');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setValidationError('Passwords do not match');
        return;
      }

      const res = await resetPassword({
        identifier: emailOrUsername.trim(),
        newPassword: passwordInput,
        confirmNewPassword: confirmPasswordInput,
      });

      if (res.success) {
        setResetSuccessMessage('Password reset successfully! Redirecting to sign in...');
        setPasswordInput('');
        setConfirmPasswordInput('');
        setTimeout(() => {
          setMode('login');
          setResetSuccessMessage(null);
        }, 2000);
      }
    }
  };

  return (
    <main 
      data-auth-screen
      className="min-h-[100dvh] w-full flex items-center justify-center p-2.5 sm:p-6 lg:p-10 relative overflow-hidden bg-[#fae8ef] select-none font-sans"
    >
      {/* Background Wallpaper: Soft Blurry Cherry Blossom Aesthetic */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sarissa-background.jpg"
        alt="Cherry Blossom Background"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none scale-105 filter blur-[3px] opacity-85"
      />
      {/* Soft warm pink ambient overlay */}
      <div className="absolute inset-0 bg-[#fce7f0]/45 backdrop-blur-[1px] pointer-events-none" />

      {/* Main Split-Screen Card */}
      <div className="w-full max-w-[890px] min-h-[auto] lg:h-[600px] bg-white rounded-[24px] sm:rounded-[34px] shadow-[0_24px_70px_rgba(190,24,93,0.18),0_6px_25px_rgba(0,0,0,0.04)] border border-white/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 transition-all duration-300">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Anime Balcony Artwork & Romantic Tagline        */}
        {/* ============================================================ */}
        <section 
          aria-label="Sarissa Illustration"
          className="lg:col-span-5 min-h-[220px] sm:min-h-[280px] lg:min-h-full relative overflow-hidden flex flex-col justify-between p-5 sm:p-7 select-none text-white"
        >
          {/* Hero Balcony Cat Illustration */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sarissa-hero-cat.jpg"
            alt="Sarissa — A cozy kitten on a balcony looking over sunset city"
            className="absolute inset-0 w-full h-full object-cover object-[center_top] select-none pointer-events-none"
            loading="eager"
          />

          {/* Gentle vignettes for text contrast */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#4a1226]/55 via-[#4a1226]/20 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#4a1226]/65 via-[#4a1226]/25 to-transparent pointer-events-none" />

          {/* Subtle glowing heart in sky (for Registration mode) */}
          {mode === 'register' && (
            <div className="absolute top-[32%] left-[26%] pointer-events-none opacity-45 transition-opacity duration-500">
              <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          )}

          {/* Floating sakura petals animation particles */}
          <div className="absolute top-4 left-6 pointer-events-none animate-petal opacity-75">
            <svg width="14" height="18" viewBox="0 0 24 24" fill="#ffb7ce">
              <path d="M12 2C8 6 6 12 12 22C18 12 16 6 12 2Z" />
            </svg>
          </div>
          <div className="absolute top-16 right-8 pointer-events-none animate-petal opacity-60" style={{ animationDelay: '2.5s' }}>
            <svg width="12" height="15" viewBox="0 0 24 24" fill="#ffaec6">
              <path d="M12 2C8 6 6 12 12 22C18 12 16 6 12 2Z" />
            </svg>
          </div>
          <div className="absolute bottom-24 left-10 pointer-events-none animate-petal opacity-65" style={{ animationDelay: '4.2s' }}>
            <svg width="15" height="19" viewBox="0 0 24 24" fill="#ffd1dc">
              <path d="M12 2C8 6 6 12 12 22C18 12 16 6 12 2Z" />
            </svg>
          </div>

          {/* Top Branding Section */}
          <div className="relative z-10 pt-1">
            <h2 className="font-courgette text-3xl sm:text-[34px] font-bold text-[#ffffff] tracking-wide flex items-center gap-1.5 drop-shadow-[0_2px_8px_rgba(74,18,38,0.7)]">
              <span>Sarissa</span>
              <span className="text-[#f43f5e] text-2xl drop-shadow-sm">♥</span>
            </h2>
            <p className="mt-0.5 text-xs sm:text-[13px] text-pink-100 font-sans italic leading-snug drop-shadow-[0_1px_4px_rgba(74,18,38,0.8)]">
              Where conversations<br />become connections
            </p>
          </div>

          {/* Bottom Romantic Tagline & Flourish */}
          <div className="relative z-10 pb-1">
            <p className="text-xs sm:text-[13px] text-[#fff0f4] font-sans italic leading-tight drop-shadow-[0_1px_5px_rgba(74,18,38,0.9)]">
              {mode === 'login' ? (
                <>Good conversations<br />make the best days <span className="text-[#f43f5e]">♥</span></>
              ) : mode === 'register' ? (
                <>New here?<br />Let&apos;s be friends! <span className="text-[#f43f5e]">♥</span></>
              ) : (
                <>Don&apos;t worry,<br />we&apos;ll get you back! <span className="text-[#f43f5e]">♥</span></>
              )}
            </p>
            {/* Hand-drawn swirl underline flourish */}
            <div className="mt-1.5 opacity-80">
              <svg width="105" height="14" viewBox="0 0 100 14" fill="none" stroke="#fff0f5" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 7 Q 24 2, 44 7 T 48 10 C 52 10, 52 3, 46 3 C 41 3, 42 10, 52 8 Q 72 4, 94 7" />
              </svg>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Soft Pastel Pink Form Container                */}
        {/* ============================================================ */}
        <section 
          aria-label="Account Form"
          className="lg:col-span-7 bg-[#ffffff] relative flex flex-col justify-between p-6 sm:p-9 lg:px-11 lg:py-8 overflow-y-auto"
        >
          {/* Hexagon Honeycomb Watermarks in Corners */}
          <HoneycombTopRight className="absolute top-0 right-0 w-36 h-32" />
          <HoneycombBottomLeft className="absolute bottom-0 left-0 w-36 h-32" />

          {/* Centered Form Wrapper */}
          <div className="w-full max-w-[370px] mx-auto my-auto relative z-10 flex flex-col justify-between py-1">
            
            {/* Header Titles */}
            <div className="mb-4 sm:mb-5">
              <h1 className="text-2xl sm:text-[27px] font-bold text-[#a21caf] tracking-tight flex items-center gap-1.5 font-display">
                <span>
                  {mode === 'login' 
                    ? 'Welcome Back' 
                    : mode === 'register' 
                    ? 'Create Account' 
                    : 'Reset Password'}
                </span>
                <span className="text-[#db2777] text-xl">♥</span>
              </h1>
              <p className="mt-1 text-xs text-[#786b75] italic leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to continue your conversations and stay connected.'
                  : mode === 'register'
                  ? 'Join Sarissa and start your journey of meaningful conversations.'
                  : 'Enter your credentials to set a new password.'}
              </p>
            </div>

            {/* Notifications / Alerts */}
            {registrationBannerMessage && mode === 'login' && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#059669]" />
                <span className="flex-1 leading-snug">{registrationBannerMessage}</span>
              </div>
            )}

            {resetSuccessMessage && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#059669]" />
                <span className="flex-1 leading-snug">{resetSuccessMessage}</span>
              </div>
            )}

            {(error || validationError) && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#e11d48]" />
                <span className="flex-1 leading-snug">{error || validationError}</span>
              </div>
            )}

            {socialMessage && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-[#fdf2f8] border border-[#fbcfe8] text-[#be185d] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#db2777]" />
                <span className="flex-1 leading-snug">{socialMessage}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* ======================================================== */}
              {/* MODE: LOGIN                                              */}
              {/* ======================================================== */}
              {mode === 'login' && (
                <>
                  {/* Field 1: Email or Username */}
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="emailOrUsername"
                      type="text"
                      required
                      autoComplete="username"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Email or Username"
                      className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                  </div>

                  {/* Field 2: Password */}
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="passwordInput"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Password"
                      className="w-full h-11 pl-10 pr-10 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#9ca3af] hover:text-[#db2777] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Remember me + Forgot password row */}
                  <div className="flex items-center justify-between pt-0.5 pb-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#db2777] accent-[#db2777] border-[#eadce5] focus:ring-[#db2777]/20 cursor-pointer"
                      />
                      <span className="text-[#6b7280] font-normal">
                        Remember me
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleModeSwitch('forgot')}
                      className="text-[#db2777] hover:text-[#be185d] hover:underline font-medium cursor-pointer transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {/* ======================================================== */}
              {/* MODE: REGISTER                                           */}
              {/* ======================================================== */}
              {mode === 'register' && (
                <>
                  {/* Field 1: Full Name */}
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="Full Name"
                      className="w-full h-10 sm:h-11 pl-10 pr-3.5 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                  </div>

                  {/* Field 2: Email Address */}
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="emailAddress"
                      type="email"
                      required
                      autoComplete="email"
                      value={emailAddressInput}
                      onChange={(e) => setEmailAddressInput(e.target.value)}
                      placeholder="Email Address"
                      className="w-full h-10 sm:h-11 pl-10 pr-3.5 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                  </div>

                  {/* Field 3: Username */}
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      required
                      autoComplete="username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Username"
                      className="w-full h-10 sm:h-11 pl-10 pr-3.5 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                  </div>

                  {/* Field 4: Password */}
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="passwordInputReg"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Password"
                      className="w-full h-10 sm:h-11 pl-10 pr-10 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#9ca3af] hover:text-[#db2777] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Field 5: Confirm Password */}
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="confirmPasswordInputReg"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full h-10 sm:h-11 pl-10 pr-10 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#9ca3af] hover:text-[#db2777] transition cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}

              {/* ======================================================== */}
              {/* MODE: FORGOT PASSWORD                                    */}
              {/* ======================================================== */}
              {mode === 'forgot' && (
                <>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="emailOrUsernameForgot"
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Email or Username"
                      className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="passwordInputForgot"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="New Password (min 6 chars)"
                      className="w-full h-11 pl-10 pr-10 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#9ca3af] hover:text-[#db2777] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3.5 pointer-events-none" />
                    <input
                      id="confirmPasswordInputForgot"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full h-11 pl-10 pr-10 text-xs sm:text-[13px] text-[#2d151d] bg-[#fcf9fb] border border-[#eedde6] rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#db2777] focus:ring-2 focus:ring-[#db2777]/15 focus:bg-white placeholder:text-[#a19da4] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1 text-[#9ca3af] hover:text-[#db2777] transition cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#d94680] to-[#be185d] hover:from-[#c93b6e] hover:to-[#a81450] text-white text-xs sm:text-[13px] font-semibold tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-[#db2777]/25 active:scale-[0.99] transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Log In'
                        : mode === 'register'
                        ? 'Sign Up'
                        : 'Reset Password'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-3 sm:my-3.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#eedde6]" />
              </div>
              <span className="relative px-3 bg-white text-[11px] text-[#9ca3af] font-normal">
                or
              </span>
            </div>

            {/* Social Login Buttons (Google, Apple, GitHub) */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialClick('Google')}
                aria-label="Continue with Google"
                className="h-10 rounded-xl sm:rounded-2xl border border-[#eedde6] bg-white hover:bg-[#fff5f8] hover:border-[#db2777]/40 text-[#2d151d] flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
              >
                <GoogleIcon monochrome={true} className="w-4 h-4 text-[#1e1e1e]" />
              </button>

              <button
                type="button"
                onClick={() => handleSocialClick('Apple')}
                aria-label="Continue with Apple"
                className="h-10 rounded-xl sm:rounded-2xl border border-[#eedde6] bg-white hover:bg-[#fff5f8] hover:border-[#db2777]/40 text-[#2d151d] flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
              >
                <AppleIcon className="w-4 h-4 text-[#1e1e1e]" />
              </button>

              <button
                type="button"
                onClick={() => handleSocialClick('GitHub')}
                aria-label="Continue with GitHub"
                className="h-10 rounded-xl sm:rounded-2xl border border-[#eedde6] bg-white hover:bg-[#fff5f8] hover:border-[#db2777]/40 text-[#2d151d] flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
              >
                <GithubIcon className="w-4 h-4 text-[#1e1e1e]" />
              </button>
            </div>

            {/* Bottom Switcher Link */}
            <footer className="pt-3.5 sm:pt-4 text-xs text-[#70626b] flex items-center justify-center text-center gap-1.5">
              {mode === 'login' ? (
                <>
                  <span>Don&apos;t have an account?</span>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    className="font-semibold text-[#db2777] hover:text-[#be185d] hover:underline inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              ) : mode === 'register' ? (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-semibold text-[#db2777] hover:text-[#be185d] hover:underline inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>Log In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <span>Remembered your password?</span>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-semibold text-[#db2777] hover:text-[#be185d] hover:underline inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>Log In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </footer>

          </div>
        </section>

      </div>
    </main>
  );
};
