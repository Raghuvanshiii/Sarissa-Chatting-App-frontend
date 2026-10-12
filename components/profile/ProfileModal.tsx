'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User as UserIcon, 
  AtSign, 
  FileText, 
  Lock, 
  Check, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Camera,
  Upload,
  Image as ImageIcon,
  Eye,
  Folder,
  Pencil
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { socketService } from '../../services/socket';
import { apiService } from '../../services/api';
import { AvatarCropModal } from './AvatarCropModal';
import { CameraModal } from '../chat/CameraModal';
import { UserStatus } from '../../types';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=250',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=250',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250',
];

export const ProfileModal: React.FC = () => {
  const { 
    user, 
    isProfileModalOpen, 
    closeProfileModal, 
    updateProfile, 
    changePassword, 
    logout, 
    deleteAccount,
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<UserStatus>('online');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar device selection and crop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Photo popup menu state (matching user's reference image)
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const photoMenuRef = useRef<HTMLDivElement>(null);

  // View photo lightbox state
  const [isViewingPhoto, setIsViewingPhoto] = useState(false);

  // Take photo camera modal state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Avatar presets gallery state (opened only via "Add avatar")
  const [isAvatarGalleryOpen, setIsAvatarGalleryOpen] = useState(false);
  const [selectedGalleryAvatar, setSelectedGalleryAvatar] = useState<string | null>(null);

  // Close photo menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setIsPhotoMenuOpen(false);
      }
    };
    if (isPhotoMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPhotoMenuOpen]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setStatus(user.status || 'online');
    }
  }, [user]);

  if (!isProfileModalOpen || !user) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    const success = await updateProfile({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      avatar: avatar.trim(),
      status,
    });

    if (success) {
      // Sync presence over socket gateway
      socketService.setPresence(status);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);

    if (newPassword !== confirmNewPassword) {
      return;
    }

    const success = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (success) {
      setSuccessMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelCrop = () => {
    setIsCropModalOpen(false);
    setSelectedImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmCrop = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const res = await apiService.uploadSingle(croppedBlob);
      const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      const rawUrl = res.attachment.url;
      const fullAvatarUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

      setAvatar(fullAvatarUrl);

      // Automatically sync updated avatar
      const success = await updateProfile({ avatar: fullAvatarUrl });
      if (success) {
        setSuccessMessage('Profile photo updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3500);
      }

      setIsCropModalOpen(false);
      setSelectedImageSrc(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar';
      alert(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handlers for Photo Menu options
  const handleViewPhoto = () => {
    setIsPhotoMenuOpen(false);
    setIsViewingPhoto(true);
  };

  const handleTakePhoto = () => {
    setIsPhotoMenuOpen(false);
    setIsCameraModalOpen(true);
  };

  const handleUploadPhoto = () => {
    setIsPhotoMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleAddAvatar = () => {
    setIsPhotoMenuOpen(false);
    setSelectedGalleryAvatar(avatar || AVATAR_PRESETS[0]);
    setIsAvatarGalleryOpen(true);
  };

  const handleRemovePhoto = async () => {
    setIsPhotoMenuOpen(false);
    setAvatar('');
    const success = await updateProfile({ avatar: '' });
    if (success) {
      setSuccessMessage('Profile photo removed');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCameraCapture = (file: File) => {
    setIsCameraModalOpen(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageSrc(e.target?.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyGalleryAvatar = async () => {
    if (!selectedGalleryAvatar) return;
    setAvatar(selectedGalleryAvatar);
    setIsAvatarGalleryOpen(false);
    const success = await updateProfile({ avatar: selectedGalleryAvatar });
    if (success) {
      setSuccessMessage('Avatar applied successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setIsDeleting(true);

    const res = await deleteAccount(deletePassword.trim() || undefined);
    setIsDeleting(false);

    if (res.success) {
      setShowDeleteModal(false);
      closeProfileModal();
    } else {
      setDeleteError(res.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeProfileModal}
    >
      <div 
        className="w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden transition-all max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F7CAD0] flex items-center justify-between bg-white/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] flex items-center justify-center text-[#C24A68] shadow-2xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2D151D] flex items-center gap-2">
                <span>Account & Profile Settings</span>
              </h2>
              <p className="text-xs text-[#7C5362] mt-0.5">
                Manage your personal details, avatar, and security
              </p>
            </div>
          </div>
          <button
            onClick={closeProfileModal}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex border-b border-[#F7CAD0] bg-white/80 px-6 gap-6">
          <button
            onClick={() => { setActiveTab('profile'); clearError(); setSuccessMessage(null); }}
            className={`py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#C24A68] text-[#C24A68]'
                : 'border-transparent text-[#7C5362] hover:text-[#C24A68]'
            }`}
          >
            General Profile
          </button>
          <button
            onClick={() => { setActiveTab('password'); clearError(); setSuccessMessage(null); }}
            className={`py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#C24A68] text-[#C24A68]'
                : 'border-transparent text-[#7C5362] hover:text-[#C24A68]'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#9F2241] text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#C24A68]" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Avatar Section: Clean baby pink profile card with rose edit popover */}
              <div className="flex flex-col items-center justify-center py-5 bg-[#FFEBF0]/70 rounded-2xl border border-[#F5BAC6] relative">
                {/* Avatar Orb & Action Menu Container */}
                <div className="relative" ref={photoMenuRef}>
                  {/* Circular Avatar Orb */}
                  <div 
                    onClick={() => setIsPhotoMenuOpen((prev) => !prev)}
                    className="relative w-28 h-28 rounded-full p-1 bg-white shadow-[0_4px_16px_rgba(194,74,104,0.12)] border-2 border-[#F5BAC6] overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-200"
                    title="Click to change profile photo"
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={avatar} 
                        alt={fullName} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#FCE7EC] flex items-center justify-center text-[#C24A68] font-bold text-3xl shadow-inner">
                        {fullName ? fullName.slice(0, 2).toUpperCase() : 'ME'}
                      </div>
                    )}

                    {/* Hover Camera Overlay */}
                    <div className="absolute inset-0 bg-[#C24A68]/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-20">
                      <Camera className="w-6 h-6 drop-shadow-xs" />
                      <span className="text-[11px] font-medium mt-1">Change</span>
                    </div>
                  </div>

                  {/* Pencil Edit Icon Button (Dark Rose Pink) */}
                  <button
                    type="button"
                    onClick={() => setIsPhotoMenuOpen((prev) => !prev)}
                    className="absolute bottom-1 right-1 p-2 rounded-full bg-[#C24A68] hover:bg-[#A23B5A] text-white shadow-md ring-2 ring-white hover:scale-105 active:scale-95 transition cursor-pointer"
                    title="Edit profile photo"
                  >
                    <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Dropdown Menu matching user reference image */}
                  {isPhotoMenuOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-full sm:translate-x-3 top-2 z-40 w-44 rounded-2xl bg-white border border-[#F5BAC6] shadow-[0_12px_36px_rgba(194,74,104,0.15)] py-1.5 animate-in fade-in zoom-in-95 duration-150">
                      {/* View photo */}
                      <button
                        type="button"
                        onClick={handleViewPhoto}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#2D151D] hover:bg-[#FFF0F3] hover:text-[#C24A68] transition cursor-pointer text-left"
                      >
                        <Eye className="w-4 h-4 text-[#C24A68] shrink-0" />
                        <span>View photo</span>
                      </button>

                      {/* Take photo */}
                      <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#2D151D] hover:bg-[#FFF0F3] hover:text-[#C24A68] transition cursor-pointer text-left"
                      >
                        <Camera className="w-4 h-4 text-[#C24A68] shrink-0" />
                        <span>Take photo</span>
                      </button>

                      {/* Upload photo */}
                      <button
                        type="button"
                        onClick={handleUploadPhoto}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#2D151D] hover:bg-[#FFF0F3] hover:text-[#C24A68] transition cursor-pointer text-left"
                      >
                        <Folder className="w-4 h-4 text-[#C24A68] shrink-0" />
                        <span>Upload photo</span>
                      </button>

                      {/* Add avatar */}
                      <button
                        type="button"
                        onClick={handleAddAvatar}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#2D151D] hover:bg-[#FFF0F3] hover:text-[#C24A68] transition cursor-pointer text-left"
                      >
                        <Sparkles className="w-4 h-4 text-[#C24A68] shrink-0" />
                        <span>Add avatar</span>
                      </button>

                      {/* Remove photo */}
                      {avatar && (
                        <>
                          <div className="my-1 border-t border-[#F7CAD0]" />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>Remove photo</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hidden file input for Upload Photo */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <p className="text-xs font-handwriting text-[#C24A68] mt-2.5 font-normal tracking-wide">Click photo or pencil to change</p>
              </div>

              {/* Status Picker */}
              <div>
                <label className="block text-xs font-bold text-[#7C5362] mb-1.5 uppercase tracking-wider">
                  Presence Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['online', 'away', 'offline'] as UserStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 capitalize transition cursor-pointer ${
                        status === s
                          ? 'border-[#C24A68] bg-[#FCE7EC] text-[#9F2241] shadow-2xs'
                          : 'border-[#F5BAC6] bg-white text-[#7C5362] hover:bg-[#FFF0F3] hover:text-[#2D151D]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        s === 'online' ? 'bg-emerald-500' : s === 'away' ? 'bg-amber-500' : 'bg-[#A8A49A]'
                      }`} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#B591A0] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#B591A0] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                  Bio
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={250}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your team about yourself..."
                    className="w-full p-3 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#B591A0] transition"
                  />
                </div>
                <p className="text-[11px] text-[#7C5362] text-right mt-0.5">{bio.length}/250</p>
              </div>

              {/* Save Button (Dark Rose Pink Primary CTA) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] active:bg-[#9F2241] text-white font-bold text-xs shadow-md shadow-[#C24A68]/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Password Change Form */
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7C5362] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B591A0]" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#C24A68] hover:bg-[#B83253] active:bg-[#9F2241] text-white font-bold text-xs shadow-md shadow-[#C24A68]/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Session and Account Danger Zone */}
          <div className="pt-4 border-t border-[#F7CAD0] space-y-3">
            {/* Sign Out Card */}
            <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-[#F5BAC6]">
              <div>
                <p className="text-xs font-bold text-[#2D151D]">Sign out of session</p>
                <p className="text-[12px] text-[#7C5362]">Terminates your session and marks you offline</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="py-2 px-3.5 rounded-xl border border-[#F5BAC6] text-[#C24A68] bg-[#FCE7EC] hover:bg-[#F8C8D4] text-xs font-semibold transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>

            {/* Delete Account Danger Card (Only displayed in General Profile) */}
            {activeTab === 'profile' && (
              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                <div className="pr-3">
                  <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Account</span>
                  </p>
                  <p className="text-[12px] text-rose-600/80 mt-0.5">
                    Permanently delete your profile, conversations, and all personal data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteError(null);
                    setDeletePassword('');
                  }}
                  className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 shrink-0 cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-rose-200 rounded-[28px] shadow-[0_24px_70px_rgba(225,29,72,0.22)] p-6 animate-in zoom-in-95 duration-150 relative text-[#144272]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">Delete Account Permanently</h3>
                <p className="text-xs text-rose-600/90 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#52789C] leading-relaxed mb-4">
              Are you sure you want to permanently delete your account <strong className="text-[#144272]">@{user.username}</strong>? All your messages, direct chats, and personal data will be completely wiped from the database.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#144272] mb-1.5">
                  Confirm your password (optional):
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8AA8C3]" />
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#BDE0F5] focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-400 text-[#144272] transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[#52789C] hover:text-[#144272] hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-[0_4px_16px_rgba(225,29,72,0.35)] flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting Account...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 stroke-[2.2]" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crop & Preview Adjustment Modal */}
      <AvatarCropModal
        isOpen={isCropModalOpen}
        imageSrc={selectedImageSrc}
        onClose={handleCancelCrop}
        onConfirm={handleConfirmCrop}
        isUploading={isUploadingAvatar}
      />

      {/* Take Photo Camera Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        hideCaption
        confirmLabel="Use Photo"
      />

      {/* View Photo Lightbox Modal */}
      {isViewingPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsViewingPhoto(false)}
        >
          <div 
            className="relative max-w-sm w-full flex flex-col items-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsViewingPhoto(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-1 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.5)] border-4 border-white overflow-hidden">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#C24A68] to-[#E07A93] flex items-center justify-center text-white font-medium text-6xl">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-white">
              <h3 className="font-semibold text-base">{fullName}</h3>
              <p className="text-xs text-white/70">@{username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Presets Gallery Modal (opened via "Add avatar") */}
      {isAvatarGalleryOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsAvatarGalleryOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] p-6 animate-in zoom-in-95 duration-150 text-[#2D151D]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#F7CAD0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D151D]">Choose an Avatar</h3>
                  <p className="text-xs text-[#7C5362]">Pick from curated avatars for your profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarGalleryOpen(false)}
                className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Avatars */}
            <div className="grid grid-cols-4 gap-3 py-6 max-h-[300px] overflow-y-auto">
              {AVATAR_PRESETS.map((preset, idx) => {
                const isSelected = selectedGalleryAvatar === preset;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGalleryAvatar(preset)}
                    className={`relative rounded-full aspect-square p-0.5 transition duration-150 cursor-pointer group ${
                      isSelected
                        ? 'ring-3 ring-[#C24A68] scale-105 shadow-md'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset}
                      alt={`Avatar ${idx + 1}`}
                      className="w-full h-full rounded-full object-cover shadow-2xs"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full bg-[#C24A68]/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-[#C24A68] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#F7CAD0]">
              <button
                type="button"
                onClick={() => setIsAvatarGalleryOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyGalleryAvatar}
                className="py-2.5 px-5 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white font-bold text-xs shadow-md shadow-[#C24A68]/25 transition active:scale-95 cursor-pointer"
              >
                Apply Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
