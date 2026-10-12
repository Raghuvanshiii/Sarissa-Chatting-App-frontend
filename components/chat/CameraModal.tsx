'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  SwitchCamera, 
  X, 
  RotateCcw, 
  Send, 
  Paperclip, 
  AlertCircle,
  Loader2,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, caption?: string, sendImmediately?: boolean) => void;
  hideCaption?: boolean;
  confirmLabel?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  hideCaption = false,
  confirmLabel,
}) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preview State (after photo snapped or video recorded)
  const [capturedMedia, setCapturedMedia] = useState<{
    file: File;
    url: string;
    type: 'photo' | 'video';
  } | null>(null);

  // Stream & Elements references (Ref avoids React re-render dependency cycles)
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileFallbackRef = useRef<HTMLInputElement>(null);

  // Stop all active camera & audio tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamReady(false);
  }, []);

  // Initialize camera stream
  const initCamera = useCallback(
    async (targetMode: 'photo' | 'video', deviceId?: string) => {
      stopStream();
      setIsLoading(true);
      setCameraError(null);

      // Safety timeout: if browser permission prompt or hardware hangs for 10s
      let isTimedOut = false;
      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        setIsLoading(false);
        setCameraError(
          'Camera connection timed out. Please check browser permissions and ensure no other application (e.g. Zoom, Teams) is using your webcam.'
        );
      }, 10000);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          clearTimeout(timeoutId);
          throw new Error('Camera access is not supported by your current browser.');
        }

        let newStream: MediaStream;
        const videoConstraint: MediaTrackConstraints = deviceId
          ? { deviceId: { ideal: deviceId } }
          : { facingMode: { ideal: 'user' } };

        try {
          // Attempt preferred 720p/1080p resolution
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...videoConstraint,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: targetMode === 'video',
          });
        } catch (firstErr) {
          // Fallback to basic unconstrained stream if ideal resolution fails
          console.warn('Standard camera constraints failed, attempting fallback...', firstErr);
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: targetMode === 'video',
          });
        }

        if (isTimedOut) {
          newStream.getTracks().forEach((t) => t.stop());
          return;
        }

        clearTimeout(timeoutId);
        streamRef.current = newStream;

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }

        setIsStreamReady(true);
        setIsLoading(false);

        // Query available cameras after permission has been granted
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
        } catch {}
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setIsStreamReady(false);

        let msg = 'Unable to connect to camera.';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = 'Camera permission was denied. Please allow camera access in your browser address bar and try again.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = 'No camera found on this device. You can attach photos or videos from your computer using the upload button below.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = 'Camera is currently in use by another application (e.g. Zoom, Teams, or another tab). Please close other camera apps and retry.';
          } else {
            msg = err.message;
          }
        }
        setCameraError(msg);
      }
    },
    [stopStream]
  );

  // Trigger initCamera when modal opens or mode changes
  useEffect(() => {
    if (isOpen && !capturedMedia) {
      initCamera(mode, selectedDeviceId);
    } else if (!isOpen) {
      stopStream();
      if (capturedMedia) {
        URL.revokeObjectURL(capturedMedia.url);
        setCapturedMedia(null);
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isOpen, mode, selectedDeviceId, capturedMedia, initCamera, stopStream]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [stopStream]);

  // Switch between connected cameras
  const handleSwitchCamera = () => {
    if (videoDevices.length <= 1) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIndex].deviceId);
  };

  // 📸 Take Photo Action
  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const url = URL.createObjectURL(blob);
        stopStream();
        setCapturedMedia({ file, url, type: 'photo' });
      },
      'image/jpeg',
      0.92
    );
  };

  // 🎥 Start Video Recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    let options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      options = { mimeType: 'video/webm;codecs=vp9,opus' };
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/webm' };
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      options = { mimeType: 'video/mp4' };
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `camera_video_${Date.now()}.${ext}`, {
          type: mime,
          lastModified: Date.now(),
        });
        const url = URL.createObjectURL(blob);
        stopStream();
        setCapturedMedia({ file, url, type: 'video' });
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setCameraError('Failed to initialize video recording on this device.');
    }
  };

  // 🎥 Stop Video Recording
  const handleStopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Discard preview and restart live camera
  const handleRetake = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
    }
  };

  // Confirm capture: send or attach
  const handleConfirmMedia = (sendImmediately: boolean) => {
    if (!capturedMedia) return;
    onCapture(capturedMedia.file, undefined, sendImmediately);
    onClose();
  };

  // Handle fallback file selection from disk
  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVid = file.type.startsWith('video');
      const url = URL.createObjectURL(file);
      stopStream();
      setCapturedMedia({ file, url, type: isVid ? 'video' : 'photo' });
      e.target.value = '';
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#2D151D] border border-[#F5BAC6]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-[#FFF5F7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Canvas & Fallback File Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          ref={fileFallbackRef}
          type="file"
          accept={mode === 'photo' ? 'image/*' : 'video/*'}
          capture={mode === 'photo' ? 'environment' : undefined}
          className="hidden"
          onChange={handleFileFallback}
        />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[#F5BAC6]/25 bg-[#2D151D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center">
              {mode === 'photo' ? <Camera className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {capturedMedia ? 'Preview Capture' : mode === 'photo' ? 'Take Photo' : 'Record Video'}
              </h3>
              <p className="text-[12px] text-[#FCE7EC]/70">
                {capturedMedia
                  ? 'Review capture, attach to chat, or send'
                  : 'Capture photos or live videos with your device camera'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!capturedMedia && videoDevices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch Camera"
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-[#262420] transition"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-[#262420] transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Viewport */}
        <div className="relative flex-1 bg-black min-h-[340px] max-h-[500px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            /* Error / Permission Blocked Screen */
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-200 mb-1">Camera Notice</h4>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{cameraError}</p>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => initCamera(mode, selectedDeviceId)}
                  className="px-4 py-2 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Choose from Device</span>
                </button>
              </div>
            </div>
          ) : capturedMedia ? (
            /* Media Review Preview Screen */
            <div className="relative w-full h-full flex items-center justify-center p-2">
              {capturedMedia.type === 'photo' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capturedMedia.url}
                  alt="Captured Photo"
                  className="max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <video
                  src={capturedMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[460px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          ) : (
            /* Live Camera Stream Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  videoRef.current?.play().catch(() => {});
                  setIsStreamReady(true);
                  setIsLoading(false);
                }}
                className={`w-full h-full object-contain max-h-[460px] transition-opacity duration-300 ${
                  isStreamReady ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 text-zinc-300 text-xs p-6 text-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#C24A68]" />
                  <div className="space-y-1">
                    <span className="font-semibold text-sm">Connecting camera...</span>
                    <p className="text-[12px] text-zinc-500">
                      If prompted, please click &quot;Allow&quot; on your browser&apos;s camera permission request.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileFallbackRef.current?.click()}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload photo or video instead</span>
                  </button>
                </div>
              )}

              {/* Video Recording Live Timer Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 text-xs font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>REC {formatTimer(recordingSeconds)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 border-t border-[#F5BAC6]/25 bg-[#2D151D]">
          {capturedMedia ? (
            /* Review & Send Actions */
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#FCE7EC]/80 hover:text-white hover:bg-[#3B1C26] text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2">
                {!hideCaption && (
                  <button
                    type="button"
                    onClick={() => handleConfirmMedia(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#F5BAC6]/40 hover:bg-[#3B1C26] text-[#FCE7EC] text-xs font-semibold transition cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach to Chat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleConfirmMedia(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{confirmLabel || 'Send Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Trigger Controls */
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-6 w-full">
                {mode === 'photo' ? (
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    disabled={!isStreamReady || !!cameraError}
                    title="Take Photo"
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 group hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <div className="w-full h-full rounded-full bg-white group-hover:bg-[#FCE7EC] transition-colors" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={!isStreamReady || !!cameraError}
                    title={isRecording ? 'Stop Recording' : 'Start Video Recording'}
                    className={`w-16 h-16 rounded-full border-4 ${
                      isRecording ? 'border-rose-500' : 'border-white'
                    } flex items-center justify-center p-1 group hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <div
                      className={`transition-all duration-200 ${
                        isRecording
                          ? 'w-6 h-6 rounded-md bg-rose-500'
                          : 'w-full h-full rounded-full bg-rose-600 group-hover:bg-rose-500'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Mode Switcher Tabs */}
              {!isRecording && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#3B1C26] border border-[#F5BAC6]/30 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      if (mode !== 'photo') setMode('photo');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition cursor-pointer ${
                      mode === 'photo'
                        ? 'bg-[#C24A68] text-white shadow-xs'
                        : 'text-[#FCE7EC]/70 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (mode !== 'video') setMode('video');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition cursor-pointer ${
                      mode === 'video'
                        ? 'bg-[#C24A68] text-white shadow-xs'
                        : 'text-[#FCE7EC]/70 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
