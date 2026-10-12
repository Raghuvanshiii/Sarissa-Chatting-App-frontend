'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderProps {
  onSendVoiceMessage?: (file: File) => Promise<boolean>;
  isAuthenticated?: boolean;
  hasActiveConversation?: boolean;
}

export function formatAudioTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useVoiceRecorder({
  onSendVoiceMessage,
  isAuthenticated = true,
  hasActiveConversation = true,
}: UseVoiceRecorderProps) {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingSeconds, setAudioRecordingSeconds] = useState(0);

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const startAudioRecording = useCallback(async () => {
    if (!isAuthenticated || !hasActiveConversation) return;

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        alert('Microphone recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      audioRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      setIsRecordingAudio(true);
      setAudioRecordingSeconds(0);

      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      audioTimerRef.current = setInterval(() => {
        setAudioRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      console.error('Audio recording failed to start:', msg);
      alert('Unable to access microphone: ' + msg);
    }
  }, [isAuthenticated, hasActiveConversation]);

  const stopAudioRecording = useCallback(
    (shouldSend: boolean) => {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }

      const recorder = audioRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = async () => {
          if (shouldSend && audioChunksRef.current.length > 0 && onSendVoiceMessage) {
            const mime = recorder.mimeType || 'audio/webm';
            const blob = new Blob(audioChunksRef.current, { type: mime });
            const file = new File([blob], `voice_message_${Date.now()}.webm`, {
              type: mime,
              lastModified: Date.now(),
            });
            await onSendVoiceMessage(file);
          }
          audioChunksRef.current = [];
        };
        recorder.stop();
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      setIsRecordingAudio(false);
      setAudioRecordingSeconds(0);
    },
    [onSendVoiceMessage]
  );

  const cancelAudioRecording = useCallback(() => {
    stopAudioRecording(false);
  }, [stopAudioRecording]);

  return {
    isRecordingAudio,
    audioRecordingSeconds,
    formattedTimer: formatAudioTimer(audioRecordingSeconds),
    startAudioRecording,
    stopAudioRecording,
    cancelAudioRecording,
  };
}
