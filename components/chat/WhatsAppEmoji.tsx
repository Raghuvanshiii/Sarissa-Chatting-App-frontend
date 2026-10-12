'use client';

import React, { useState } from 'react';

// Maps common emoji characters to unified hex strings (lowercase)
export function emojiToUnified(char: string): string {
  if (!char) return '';

  // Get raw code points joined with '-'
  const codePoints: string[] = [];
  for (const sym of Array.from(char)) {
    const cp = sym.codePointAt(0);
    if (cp !== undefined) {
      codePoints.push(cp.toString(16).toLowerCase());
    }
  }

  const rawUnified = codePoints.join('-');
  return rawUnified;
}

export function getAppleEmojiUrl(unified: string): string {
  // If unified has unnecessary fe0e/fe0f text variations that might not exist in the spritesheet,
  // we normalize it if needed, but emoji-datasource-apple standard is full unified code
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`;
}

export function getTwemojiUrl(unified: string): string {
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${unified}.svg`;
}

interface WhatsAppEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
  lazyLoad?: boolean;
}

export const WhatsAppEmoji: React.FC<WhatsAppEmojiProps> = ({
  emoji,
  size = 20,
  className = '',
  lazyLoad = false,
}) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const unified = emojiToUnified(emoji);

  if (!unified || fallbackStage >= 3) {
    return (
      <span
        className={`inline-block emoji-font ${className}`}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  const cleanUnified = unified.replace(/-fe0f/g, '');
  let currentUrl = getAppleEmojiUrl(unified);
  if (fallbackStage === 1) {
    currentUrl = getAppleEmojiUrl(cleanUnified);
  } else if (fallbackStage === 2) {
    currentUrl = getTwemojiUrl(cleanUnified);
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentUrl}
      alt={emoji}
      width={size}
      height={size}
      loading={lazyLoad ? 'lazy' : 'eager'}
      onError={() => {
        setFallbackStage((prev) => prev + 1);
      }}
      className={`inline-block align-middle object-contain select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        verticalAlign: '-0.15em',
      }}
      draggable={false}
    />
  );
};

// Regex matching all modern Unicode emojis including:
// - Flag regional indicator pairs (e.g. 🇧🇪, 🇮🇳, 🇺🇸)
// - Emoji pictographs with optional variation selector (\uFE0F) and skin tone modifiers
// - Multi-character ZWJ sequences (e.g. 👨‍👩‍👧‍👦, 🏳️‍🌈)
const EMOJI_REGEX =
  /((?:[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?[\u{1F3FB}-\u{1F3FF}]?(?:\u200D(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(?:\uFE0F|\uFE0E)?)*)))/gu;

/**
 * Checks if a string contains ONLY emojis (up to 3 emojis) with optional whitespace.
 * In WhatsApp, 1-3 emojis sent without text are displayed in jumbo size!
 */
export function isOnlyEmojis(text: string): { isOnly: boolean; count: number } {
  const trimmed = text.trim();
  if (!trimmed) return { isOnly: false, count: 0 };

  const matches = trimmed.match(EMOJI_REGEX);
  if (!matches) return { isOnly: false, count: 0 };

  // Strip all emojis and whitespace
  const textWithoutEmojis = trimmed.replace(EMOJI_REGEX, '').replace(/\s/g, '');
  if (textWithoutEmojis.length === 0 && matches.length >= 1 && matches.length <= 4) {
    return { isOnly: true, count: matches.length };
  }

  return { isOnly: false, count: matches?.length || 0 };
}

/**
 * Renders arbitrary message text replacing Unicode emojis with Apple/WhatsApp 3D graphics.
 * If text contains 1-3 emojis ONLY, renders them in WhatsApp jumbo size.
 */
export function renderMessageWithWhatsAppEmojis(text: string): React.ReactNode {
  if (!text) return null;

  const trimmed = text.trim();

  // If text is a standalone GIF or Sticker image URL, render as media
  if (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    (trimmed.endsWith('.gif') ||
      trimmed.endsWith('.png') ||
      trimmed.endsWith('.webp') ||
      trimmed.includes('media.giphy.com') ||
      trimmed.includes('flaticon.com'))
  ) {
    return (
      <div className="py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trimmed}
          alt="Shared media"
          loading="lazy"
          className="rounded-xl max-h-56 max-w-full sm:max-w-xs object-cover shadow-xs border border-black/10"
        />
      </div>
    );
  }

  const { isOnly, count } = isOnlyEmojis(text);

  // WhatsApp jumbo emojis for 1-3 emojis
  if (isOnly) {
    const jumboSize = count === 1 ? 48 : count === 2 ? 38 : 32;
    const emojiMatches = text.trim().match(EMOJI_REGEX) || [];
    return (
      <span className="inline-flex items-center gap-1.5 py-1">
        {emojiMatches.map((em, idx) => (
          <WhatsAppEmoji key={idx} emoji={em} size={jumboSize} />
        ))}
      </span>
    );
  }

  // Normal inline text with emojis
  const parts = text.split(EMOJI_REGEX);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.match(EMOJI_REGEX)) {
          return <WhatsAppEmoji key={index} emoji={part} size={21} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
