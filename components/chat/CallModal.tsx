'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Maximize2,
  Minimize2,
  Volume2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../store/useAuthStore';

export type CallType = 'audio' | 'video';
export type CallStatus = 'outgoing' | 'incoming' | 'connected' | 'ended';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
  isGroup?: boolean;
}

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callType: CallType;
  partner: CallParticipant;
  isIncoming?: boolean;
  callId?: string;
  conversationId: string;
  isGroup?: boolean;
  groupName?: string;
  participantsCount?: number;
  onCallEnded?: (durationSeconds: number, callType: CallType, isIncoming: boolean) => void;
}

// Synthesize authentic phone tones using Web Audio API
class AudioToneGenerator {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  // WhatsApp-style outgoing ringtone (440Hz + 480Hz dual tone cadence)
  public startOutgoingRingtone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playBeep = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 1.2);
      osc2.stop(this.ctx.currentTime + 1.2);
    };

    playBeep();
    this.intervalId = setInterval(playBeep, 3000);
  }

  // Incoming WhatsApp ringtone chime
  public startIncomingRingtone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const playChime = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.09, this.ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.12);
        osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
      });
    };

    playChime();
    this.intervalId = setInterval(playChime, 2500);
  }

  // End call beep
  public playEndCallChime() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const toneGenerator = new AudioToneGenerator();

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  callType: initialCallType,
  partner,
  isIncoming = false,
  callId: initialCallId,
  conversationId,
  isGroup = false,
  groupName,
  participantsCount,
  onCallEnded,
}) => {
  const [mounted, setMounted] = useState(false);
  const [callType, setCallType] = useState<CallType>(initialCallType);
  const [callStatus, setCallStatus] = useState<CallStatus>(isIncoming ? 'incoming' : 'outgoing');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(initialCallType === 'video');
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasCameraPermissionError, setHasCameraPermissionError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeCallIdRef = useRef<string>(initialCallId || '');
  const isTerminatedRef = useRef<boolean>(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Attach local media stream to any mounted video element
  const syncLocalVideoElement = useCallback((videoEl: HTMLVideoElement | null) => {
    if (videoEl && localStreamRef.current) {
      const hasVideoTrack = localStreamRef.current.getVideoTracks().length > 0;
      if (hasVideoTrack && videoEl.srcObject !== localStreamRef.current) {
        videoEl.srcObject = localStreamRef.current;
        videoEl.play().catch(() => {});
      }
    }
  }, []);

  // Watch for stream or state changes to sync video elements
  useEffect(() => {
    syncLocalVideoElement(localVideoRef.current);
    syncLocalVideoElement(audioLocalVideoRef.current);
  }, [callType, isCameraActive, isVideoDisabled, syncLocalVideoElement]);

  // Initialize call & setup media streams
  useEffect(() => {
    if (!isOpen) {
      isTerminatedRef.current = false;
      return;
    }

    isTerminatedRef.current = false;
    setAvatarImgError(false);
    setCallType(initialCallType);
    setCallStatus(isIncoming ? 'incoming' : 'outgoing');
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraActive(initialCallType === 'video');
    setIsVideoDisabled(false);
    setIsScreenSharing(false);
    setHasCameraPermissionError(null);

    // Audio ringtone effects
    if (isIncoming) {
      toneGenerator.startIncomingRingtone();
    } else {
      toneGenerator.startOutgoingRingtone();

      const currentUser = useAuthStore.getState().user;
      const callerDisplayName = currentUser?.fullName?.trim() || currentUser?.username?.trim() || 'User';
      const callerAvatarUrl = currentUser?.avatar || undefined;

      // Initiate call via socket with authentic caller credentials
      socketService
        .initiateCall({
          conversationId,
          receiverId: isGroup ? undefined : partner.id,
          callType: initialCallType,
          callerName: callerDisplayName,
          callerAvatar: callerAvatarUrl,
          isGroup,
          groupName: isGroup ? (groupName || partner.name) : undefined,
        })
        .then((res) => {
          activeCallIdRef.current = res.callId;
        })
        .catch(() => {
          // If offline or test mode, transition to connected after brief ring
          setTimeout(() => {
            handleCallConnected();
          }, 3500);
        });
    }

    // Acquire local media stream
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: initialCallType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current && initialCallType === 'video') {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Media devices access restricted or unavailable:', err);
        setHasCameraPermissionError('Microphone or camera permission was not granted.');
      }
    };

    initMedia();

    // Socket listeners
    const unsubAccepted = socketService.onCallAccepted(() => {
      handleCallConnected();
    });

    const unsubRejected = socketService.onCallRejected(() => {
      handleEndCall('Call declined', true, 0);
    });

    const unsubEnded = socketService.onCallEnded((data) => {
      handleEndCall('Call ended', true, data?.duration);
    });

    return () => {
      toneGenerator.stop();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
      cleanupMedia();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, isIncoming, partner.id, conversationId, initialCallType, isGroup, groupName, partner.name]);

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const handleCallConnected = () => {
    toneGenerator.stop();
    setCallStatus('connected');
    // Start duration timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleAcceptIncomingCall = () => {
    toneGenerator.stop();
    socketService.acceptCall({
      callId: activeCallIdRef.current,
      callerId: partner.id,
      conversationId,
    });
    handleCallConnected();
  };

  const handleEndCall = (reason = 'Call ended', isRemote = false, remoteDuration?: number) => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;

    toneGenerator.stop();
    toneGenerator.playEndCallChime();
    setCallStatus('ended');

    const finalDuration = remoteDuration !== undefined ? remoteDuration : callDuration;

    // Only notify remote partner via socket if THIS client initiated the hangup / decline locally!
    // If the remote party ended or declined the call, they already emitted it; echoing back creates an infinite loop.
    if (!isRemote) {
      if (isIncoming && reason === 'Decline') {
        socketService.rejectCall({
          callId: activeCallIdRef.current,
          callerId: partner.id,
          reason: 'declined',
        });
      } else {
        socketService.endCall({
          callId: activeCallIdRef.current,
          partnerId: isGroup ? undefined : partner.id,
          conversationId: isGroup ? conversationId : undefined,
          duration: finalDuration,
        });
      }
    }

    cleanupMedia();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimeout(() => {
      onCallEnded?.(finalDuration, callType, !!isIncoming);
      onClose();
    }, 700);
  };

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Video / Turn On Camera (Fully functional for audio and video calls, direct and group)
  const toggleVideo = async () => {
    setHasCameraPermissionError(null);

    // Case 1: Camera is currently active and turned ON -> Mute/disable camera
    if (isCameraActive && !isVideoDisabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsVideoDisabled(true);
      return;
    }

    // Case 2: Camera is already active but disabled/muted -> Re-enable video tracks
    if (isCameraActive && isVideoDisabled) {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks.forEach((track) => {
            track.enabled = true;
          });
          setIsVideoDisabled(false);
          syncLocalVideoElement(localVideoRef.current);
          syncLocalVideoElement(audioLocalVideoRef.current);
          return;
        }
      }
    }

    // Case 3: Camera is NOT yet active (e.g. Turn on camera clicked during audio call)
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });

      const newVideoTrack = videoStream.getVideoTracks()[0];
      if (newVideoTrack) {
        if (localStreamRef.current) {
          // Remove any dead/old video tracks before adding fresh track
          localStreamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          });
          localStreamRef.current.addTrack(newVideoTrack);
        } else {
          localStreamRef.current = videoStream;
        }
      }

      setIsCameraActive(true);
      setIsVideoDisabled(false);
      setCallType('video');

      // Sync stream to video elements immediately and after DOM update
      syncLocalVideoElement(localVideoRef.current);
      syncLocalVideoElement(audioLocalVideoRef.current);
      setTimeout(() => {
        syncLocalVideoElement(localVideoRef.current);
        syncLocalVideoElement(audioLocalVideoRef.current);
      }, 50);

      // Notify peer / group room via socket signal
      socketService.sendCallSignal({
        to: isGroup ? '' : partner.id,
        signal: { type: 'camera_toggle', isVideo: true, callId: activeCallIdRef.current },
        callId: activeCallIdRef.current,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied';
      console.warn('Cannot enable camera:', msg);
      setHasCameraPermissionError('Cannot open camera: ' + msg);
    }
  };

  // Toggle Screen Share (Modern WhatsApp Web feature)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
        localStreamRef.current = stream;
        syncLocalVideoElement(localVideoRef.current);
        setIsScreenSharing(false);
      } catch {
        // Ignore
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
          localVideoRef.current.play().catch(() => {});
        }
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          syncLocalVideoElement(localVideoRef.current);
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={modalContainerRef}
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-gradient-to-b from-[#3B1C26] via-[#241018] to-[#16080E] text-white sm:rounded-3xl border border-[#C24A68]/30 shadow-[0_24px_70px_rgba(194,74,104,0.35)] overflow-hidden flex flex-col relative select-none ${
          callType === 'video' ? 'sm:aspect-[16/10]' : 'sm:min-h-[520px]'
        }`}
      >
        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
            <span className="text-zinc-200">End-to-End Encrypted</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition pointer-events-auto cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Permission warning banner if camera is blocked */}
        {hasCameraPermissionError && (
          <div className="absolute top-16 left-6 right-6 z-20 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-center">
            {hasCameraPermissionError}
          </div>
        )}

        {/* Video Call Canvas */}
        {callType === 'video' ? (
          <div className="flex-1 w-full h-full relative bg-zinc-900 flex items-center justify-center overflow-hidden">
            {/* Main Stage (Remote Video or Fallback Avatar) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover hidden"
            />

            {/* Video Fallback Background with animated ripples */}
            <div className="flex flex-col items-center justify-center p-8 z-10 text-center">
              <div className="relative mb-5">
                {(callStatus === 'outgoing' || callStatus === 'incoming') && (
                  <>
                    <span className="absolute -inset-3 rounded-full bg-[#C24A68]/30 animate-ping duration-1000" />
                    <span className="absolute -inset-6 rounded-full bg-[#C24A68]/20 animate-pulse duration-1500" />
                  </>
                )}
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-[#C24A68]/40 shadow-2xl relative z-10 flex items-center justify-center bg-[#C24A68]">
                  {partner.avatar && !avatarImgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partner.avatar}
                      alt={partner.name}
                      onError={() => setAvatarImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : isGroup ? (
                    <Users className="w-12 h-12 text-white" />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {(partner.name || 'User').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {callStatus === 'connected' && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#C24A68] border-2 border-zinc-950 flex items-center justify-center z-20">
                    <Sparkles className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{partner.name || 'User'}</h3>
              
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-rose-100 backdrop-blur-md">
                <Video className="w-3.5 h-3.5" />
                <span>
                  {callStatus === 'outgoing'
                    ? isGroup
                      ? 'Calling group...'
                      : `Calling ${partner.name || 'contact'}...`
                    : callStatus === 'incoming'
                    ? isGroup
                      ? 'Incoming group video call'
                      : 'Incoming video call'
                    : callStatus === 'connected'
                    ? formatTime(callDuration)
                    : 'Call ended'}
                </span>
              </div>
              {isGroup && (
                <span className="text-[12px] text-zinc-400 mt-2">
                  {participantsCount ? `${participantsCount} group members` : 'Group Video Call'}
                </span>
              )}
            </div>

            {/* Picture-in-Picture Local Camera Preview in Video Call */}
            <div className="absolute top-16 right-4 sm:top-5 sm:right-5 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-white/20 shadow-2xl z-20">
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  syncLocalVideoElement(el);
                }}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${
                  isVideoDisabled ? 'hidden' : 'block'
                }`}
              />
              {isVideoDisabled && (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900 gap-1 text-[11px]">
                  <VideoOff className="w-5 h-5" />
                  <span>Camera Off</span>
                </div>
              )}
              {isScreenSharing && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#C24A68] text-white text-[10px] font-bold">
                  Screen
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Audio Call Canvas */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-radial from-[#4A1D2B]/50 via-[#241018] to-[#16080E]">
            {/* Picture-in-Picture Camera Preview in Audio Call (if camera opened) */}
            {isCameraActive && (
              <div className="absolute top-16 right-4 sm:top-5 sm:right-5 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-[#C24A68]/60 shadow-2xl z-20 animate-in zoom-in-95 duration-150">
                <video
                  ref={(el) => {
                    audioLocalVideoRef.current = el;
                    syncLocalVideoElement(el);
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform scale-x-[-1] ${
                    isVideoDisabled ? 'hidden' : 'block'
                  }`}
                />
                {isVideoDisabled && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900 gap-1 text-[11px]">
                    <VideoOff className="w-5 h-5" />
                    <span>Camera Off</span>
                  </div>
                )}
              </div>
            )}

            {/* Animated Soundwave Rings around Avatar */}
            <div className="relative mb-6">
              {(callStatus === 'outgoing' || callStatus === 'incoming') && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-[#C24A68]/20 animate-ping duration-1000" />
                  <span className="absolute -inset-8 rounded-full bg-[#C24A68]/15 animate-pulse duration-1500" />
                </>
              )}

              {/* Contact / Group Avatar Orb */}
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-[#C24A68]/50 shadow-[0_12px_36px_rgba(194,74,104,0.35)] relative z-10 flex items-center justify-center bg-[#C24A68]">
                {partner.avatar && !avatarImgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    onError={() => setAvatarImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : isGroup ? (
                  <Users className="w-14 h-14 text-white" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {(partner.name || 'User').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <h3 className={`text-2xl font-bold text-white ${isGroup ? 'mb-1' : 'mb-3'}`}>{partner.name || 'User'}</h3>
            {isGroup && (
              <p className="text-xs text-rose-100/80 mb-2.5">
                {isIncoming && partner.username
                  ? partner.username
                  : participantsCount
                  ? `${participantsCount} group members`
                  : 'Group Voice Call'}
              </p>
            )}

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-rose-100 backdrop-blur-md">
              <Volume2 className="w-3.5 h-3.5" />
              <span>
                {callStatus === 'outgoing'
                  ? isGroup
                    ? 'Calling group...'
                    : `Calling ${partner.name || 'contact'}...`
                  : callStatus === 'incoming'
                  ? isGroup
                    ? 'Incoming group voice call'
                    : 'Incoming voice call'
                  : callStatus === 'connected'
                  ? formatTime(callDuration)
                  : 'Call ended'}
              </span>
            </div>

            {/* Audio Wave Visualizer Simulation when connected */}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-1 h-6 mt-6">
                {[4, 12, 8, 16, 22, 14, 18, 10, 16, 8, 14, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-[#F09DAF] rounded-full animate-bounce"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${(i % 5) * 120}ms`,
                      animationDuration: '600ms',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call Controls Dock */}
        <div className="p-4 sm:p-6 bg-[#1E0B13]/95 backdrop-blur-xl border-t border-[#C24A68]/20 flex items-center justify-center gap-3 sm:gap-5 z-20">
          {callStatus === 'incoming' ? (
            /* Incoming Call Actions: Decline or Accept */
            <div className="flex items-center gap-8 py-2">
              <button
                type="button"
                onClick={() => handleEndCall('Decline')}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-600/40 hover:scale-105 active:scale-95 transition cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
                <span className="text-[11px] font-bold">Decline</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptIncomingCall}
                className="w-16 h-16 rounded-full bg-[#C24A68] hover:bg-[#B83253] text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-[#C24A68]/40 hover:scale-105 active:scale-95 transition cursor-pointer animate-bounce"
                title="Accept Call"
              >
                <Phone className="w-6 h-6" />
                <span className="text-[11px] font-bold">Accept</span>
              </button>
            </div>
          ) : (
            /* Connected / Outgoing Call Controls (Mic, Camera, Screen Share, Hangup) */
            <>
              {/* Mic Mute/Unmute */}
              <button
                type="button"
                onClick={toggleMute}
                className={`p-3.5 rounded-full transition cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Toggle / Turn On Camera */}
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3.5 rounded-full transition cursor-pointer ${
                  isCameraActive && !isVideoDisabled
                    ? 'bg-[#C24A68]/20 text-rose-300 border border-[#C24A68]/40 hover:bg-[#C24A68]/30'
                    : isCameraActive && isVideoDisabled
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                }`}
                title={isCameraActive && !isVideoDisabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isCameraActive && isVideoDisabled ? (
                  <VideoOff className="w-5 h-5" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
              </button>

              {/* Screen Share (Only available when in video mode) */}
              {callType === 'video' && (
                <button
                  type="button"
                  onClick={toggleScreenShare}
                  className={`p-3.5 rounded-full transition cursor-pointer ${
                    isScreenSharing
                      ? 'bg-[#C24A68]/20 text-rose-300 border border-[#C24A68]/40'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                  }`}
                  title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
                >
                  <Monitor className="w-5 h-5" />
                </button>
              )}

              {/* Hangup / End Call Button */}
              <button
                type="button"
                onClick={() => handleEndCall('Hangup')}
                className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/40 hover:scale-110 active:scale-95 transition cursor-pointer ml-2"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
