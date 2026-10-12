'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { WhatsAppEmoji } from './WhatsAppEmoji';

interface FreshConversationGreetingProps {
  onSendWave: () => void;
  isSending?: boolean;
}

export const FreshConversationGreeting: React.FC<FreshConversationGreetingProps> = ({
  onSendWave,
  isSending = false,
}) => {
  return (
    <div className="m-auto flex flex-col items-center justify-center w-full select-none animate-in fade-in zoom-in-95 duration-300">
      {/* Frosted Rose / Pink Greeting Card */}
      <div className="w-full max-w-[320px] sm:max-w-[340px] rounded-[32px] px-7 py-8 sm:px-8 sm:py-9 bg-gradient-to-b from-[#C24A68]/90 to-[#A23B5A]/95 backdrop-blur-xl border border-white/25 shadow-[0_16px_40px_rgba(194,74,104,0.3)] flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_20px_48px_rgba(194,74,104,0.38)]">
        
        {/* Direct Waving Hand Emoji */}
        <div 
          className="mb-6 relative flex items-center justify-center cursor-pointer group"
          onClick={onSendWave}
          title="Click to send wave"
        >
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center transition-transform duration-300 group-hover:scale-115 active:rotate-12 drop-shadow-md">
            <WhatsAppEmoji emoji="👋" size={84} />
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-[22px] sm:text-[24px] font-bold text-white tracking-tight leading-tight mb-2">
          It&apos;s quiet here...
        </h3>

        {/* Subtitle */}
        <p className="text-[15px] sm:text-[16px] text-white/95 font-medium leading-relaxed max-w-[260px] mb-7 text-center">
          <span>Start the conversation by saying </span>
          <span className="inline-block whitespace-nowrap">hello! 👋</span>
        </p>

        {/* Send Wave Action Button */}
        <button
          type="button"
          onClick={onSendWave}
          disabled={isSending}
          className="inline-flex items-center justify-center px-8 py-2.5 sm:py-3 rounded-full bg-white hover:bg-[#FFF0F3] active:scale-95 text-[#A23B5A] font-bold text-[15.5px] sm:text-[16px] shadow-[0_4px_14px_rgba(162,59,90,0.25)] hover:shadow-[0_6px_20px_rgba(162,59,90,0.35)] transition-all duration-200 cursor-pointer disabled:opacity-60"
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#A23B5A]" />
              <span>Sending...</span>
            </span>
          ) : (
            <span>Send Wave</span>
          )}
        </button>
      </div>
    </div>
  );
};
