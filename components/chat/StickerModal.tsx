'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Sticker as StickerIcon, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Send,
  Loader2
} from 'lucide-react';

export interface StickerData {
  _type: 'sticker';
  url: string;
  name?: string;
}

interface StickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSticker: (sticker: StickerData) => void;
  onUploadStickerFile: (file: File) => Promise<string | null>;
}

// Popular curated WhatsApp stickers
const SAMPLE_STICKERS: { id: string; name: string; url: string }[] = [
  {
    id: 's1',
    name: 'Party Parrot',
    url: 'https://media.giphy.com/media/l3q2wJsC23ikJg9xe/giphy.gif',
  },
  {
    id: 's2',
    name: 'Dancing Doge',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
  },
  {
    id: 's3',
    name: 'Mind Blown',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  },
  {
    id: 's4',
    name: 'Cat Vibing',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
  },
  {
    id: 's5',
    name: 'Heart Love',
    url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif',
  },
  {
    id: 's6',
    name: 'Laughing Tears',
    url: 'https://media.giphy.com/media/xr9AQyxLtjlxS/giphy.gif',
  },
  {
    id: 's7',
    name: 'Applause Clap',
    url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif',
  },
  {
    id: 's8',
    name: 'Fire Lit',
    url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif',
  },
];

export const StickerModal: React.FC<StickerModalProps> = ({
  isOpen,
  onClose,
  onSendSticker,
  onUploadStickerFile,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'pack'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
    }
  };

  const handleSendCustomSticker = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await onUploadStickerFile(selectedFile);
      if (uploadedUrl) {
        onSendSticker({
          _type: 'sticker',
          url: uploadedUrl,
          name: selectedFile.name,
        });
        onClose();
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1C1B18]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-[#2D151D]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-xs">
              <StickerIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D151D]">
                New Sticker
              </h2>
              <p className="text-xs text-[#7C5362]">
                Upload custom sticker or pick from collection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#F5BAC6] bg-[#FFEBF0]/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-[#C24A68] text-white shadow-xs font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pack')}
            className={`flex-1 py-2 text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pack'
                ? 'bg-[#C24A68] text-white shadow-xs font-bold'
                : 'text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sticker Pack</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/gif,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#F5BAC6] hover:border-[#C24A68] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition bg-white/70 hover:bg-white group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FCE7EC] text-[#C24A68] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#2D151D]">
                      Click to choose an image
                    </p>
                    <p className="text-[12px] text-[#7C5362] mt-0.5">
                      Supports PNG, WebP, GIF, JPEG (transparent PNG recommended)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl bg-white p-6 flex flex-col items-center justify-center min-h-[180px] border border-[#F5BAC6]">
                    {/* Checkerboard background pattern for transparent PNG preview */}
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px] rounded-xl" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Sticker preview"
                      className="max-h-40 max-w-full object-contain drop-shadow-md z-10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-[#2D151D]/70 hover:bg-[#2D151D] text-white transition z-20 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center text-xs text-[#C24A68] hover:underline cursor-pointer font-bold"
                  >
                    Choose a different image
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {SAMPLE_STICKERS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onSendSticker({
                      _type: 'sticker',
                      url: st.url,
                      name: st.name,
                    });
                    onClose();
                  }}
                  className="p-2 rounded-xl border border-[#F5BAC6] hover:border-[#C24A68] bg-white hover:bg-[#FFEBF0] transition hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer group shadow-2xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={st.url}
                    alt={st.name}
                    className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                  <span className="text-[11px] text-[#7C5362] truncate w-full text-center">
                    {st.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer for upload tab */}
        {activeTab === 'upload' && previewUrl && (
          <div className="px-5 py-3 border-t border-[#F5BAC6] flex items-center justify-end gap-2 bg-[#FFEBF0]/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#F5BAC6] text-[#7C5362] hover:bg-[#FCE7EC] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSendCustomSticker}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#C24A68] hover:bg-[#B83253] text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Sticker</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
