'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Film, 
  Type as TypeIcon, 
  Link as LinkIcon, 
  Upload, 
  Check, 
  Loader2, 
  Sparkles,
  ExternalLink,
  AlignLeft,
  AlignCenter
} from 'lucide-react';
import { useStoryStore } from '../../store/useStoryStore';
import { apiService } from '../../services/api';
import { StoryType, StoryTextStyle } from '../../types/story';

const TEXT_BACKGROUND_PRESETS = [
  { name: 'Forest Dusk', value: 'linear-gradient(135deg, #1B2B20 0%, #0F1712 100%)' },
  { name: 'Midnight Glow', value: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' },
  { name: 'Warm Amber', value: 'linear-gradient(135deg, #36200A 0%, #1F1306 100%)' },
  { name: 'Lavender Night', value: 'linear-gradient(135deg, #2E1065 0%, #170B2C 100%)' },
  { name: 'Rose Twilight', value: 'linear-gradient(135deg, #4C0519 0%, #22030B 100%)' },
  { name: 'Ocean Depths', value: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)' },
  { name: 'Charcoal Minimal', value: '#181816' },
];

export const StoryCreatorModal: React.FC = () => {
  const { isCreateStoryOpen, closeCreateStory, createStory, isCreating } = useStoryStore();

  const [activeType, setActiveType] = useState<StoryType>('image');

  // Media file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState('');

  // Text story state
  const [textContent, setTextContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState(TEXT_BACKGROUND_PRESETS[0].value);
  const [selectedFont, setSelectedFont] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [textAlign, setTextAlign] = useState<'center' | 'left'>('center');

  // Link story state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isCreateStoryOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size cannot exceed 50MB.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);

    // Create local object URL for preview
    const localUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(localUrl);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setMediaPreviewUrl(null);
    setCaption('');
    setTextContent('');
    setLinkUrl('');
    setLinkTitle('');
    setErrorMessage(null);
    setUploadProgress(0);
    setIsUploadingMedia(false);
  };

  const handleClose = () => {
    resetForm();
    closeCreateStory();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // 1. Image or Video Story
      if (activeType === 'image' || activeType === 'video') {
        if (!selectedFile) {
          setErrorMessage(`Please select a ${activeType} file to upload.`);
          return;
        }

        setIsUploadingMedia(true);
        // Upload media file via existing upload endpoint
        const uploadRes = await apiService.uploadSingle(selectedFile, (progress) => {
          setUploadProgress(progress);
        });

        setIsUploadingMedia(false);

        if (!uploadRes.success || !uploadRes.attachment) {
          setErrorMessage('Failed to upload media. Please try again.');
          return;
        }

        const res = await createStory({
          type: activeType,
          mediaUrl: uploadRes.attachment.url,
          caption: caption.trim(),
          duration: activeType === 'video' ? 15 : 6,
        });

        if (res.success) {
          handleClose();
        } else {
          setErrorMessage(res.error || 'Failed to create story.');
        }
        return;
      }

      // 2. Text Story
      if (activeType === 'text') {
        if (!textContent.trim()) {
          setErrorMessage('Please type some text for your story.');
          return;
        }

        const res = await createStory({
          type: 'text',
          textContent: textContent.trim(),
          textStyle: {
            background: selectedBackground,
            textColor: '#FFFFFF',
            fontFamily: selectedFont,
            fontSize: textContent.length < 50 ? 'large' : 'medium',
          },
          duration: 6,
        });

        if (res.success) {
          handleClose();
        } else {
          setErrorMessage(res.error || 'Failed to publish text story.');
        }
        return;
      }

      // 3. Link Story
      if (activeType === 'link') {
        if (!linkUrl.trim()) {
          setErrorMessage('Please provide a valid link URL.');
          return;
        }

        let formattedUrl = linkUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }

        const res = await createStory({
          type: 'link',
          linkUrl: formattedUrl,
          linkTitle: linkTitle.trim() || 'Tap to visit link',
          caption: caption.trim(),
          duration: 6,
        });

        if (res.success) {
          handleClose();
        } else {
          setErrorMessage(res.error || 'Failed to publish link story.');
        }
      }
    } catch (err: unknown) {
      setIsUploadingMedia(false);
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMessage(msg);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-lg bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_24px_70px_rgba(194,74,104,0.25)] overflow-hidden flex flex-col transition-all duration-200 max-h-[92vh] text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCE7EC] text-[#C24A68] border border-[#F5BAC6] flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#2D151D]">
                Add Story
              </h2>
              <p className="text-xs text-[#7C5362]">
                Visible to your connections for 24 hours
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Type Selector Tabs */}
        <div className="flex border-b border-[#F5BAC6] bg-[#FFEBF0]/40 px-4 sm:px-6 gap-3 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { setActiveType('image'); resetForm(); }}
            className={`py-3 text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeType === 'image'
                ? 'border-[#C24A68] text-[#C24A68] font-bold'
                : 'border-transparent text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveType('video'); resetForm(); }}
            className={`py-3 text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeType === 'video'
                ? 'border-[#C24A68] text-[#C24A68] font-bold'
                : 'border-transparent text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveType('text'); resetForm(); }}
            className={`py-3 text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeType === 'text'
                ? 'border-[#C24A68] text-[#C24A68] font-bold'
                : 'border-transparent text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveType('link'); resetForm(); }}
            className={`py-3 text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeType === 'link'
                ? 'border-[#C24A68] text-[#C24A68] font-bold'
                : 'border-transparent text-[#7C5362] hover:text-[#2D151D] font-medium'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#FFEBF0] border border-[#F5BAC6] text-[#9F2241] text-xs">
              {errorMessage}
            </div>
          )}

          {/* 1. IMAGE & VIDEO TAB */}
          {(activeType === 'image' || activeType === 'video') && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={activeType === 'image' ? 'image/*' : 'video/*'}
                className="hidden"
              />

              {/* Upload Drop Zone / Preview Area */}
              {mediaPreviewUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#F5BAC6] bg-black max-h-[300px] flex items-center justify-center group">
                  {activeType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaPreviewUrl}
                      alt="Story preview"
                      className="w-full max-h-[300px] object-contain"
                    />
                  ) : (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      className="w-full max-h-[300px] object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setMediaPreviewUrl(null);
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
                    title="Change media"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[#F5BAC6] hover:border-[#C24A68] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white/70 hover:bg-[#FFEBF0]/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center mb-3 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D151D]">
                    Upload {activeType === 'image' ? 'a photo' : 'a video'}
                  </h4>
                  <p className="text-[12px] text-[#7C5362] mt-1 max-w-[220px]">
                    PNG, JPG, MP4, WebM up to 50MB
                  </p>
                </div>
              )}

              {/* Caption Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D151D]">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a thought or description..."
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362] transition"
                />
              </div>
            </div>
          )}

          {/* 2. TEXT STORY TAB */}
          {activeType === 'text' && (
            <div className="space-y-4">
              {/* Rich Visual Story Canvas Preview */}
              <div
                className="relative rounded-2xl min-h-[220px] max-h-[280px] p-6 flex flex-col justify-center items-center text-center shadow-inner overflow-hidden transition-all duration-300"
                style={{
                  background: selectedBackground,
                  fontFamily: selectedFont === 'serif' ? 'serif' : selectedFont === 'mono' ? 'monospace' : 'sans-serif',
                }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="What's on your mind? Type your story..."
                  maxLength={400}
                  rows={4}
                  className={`w-full bg-transparent border-none focus:outline-none text-white placeholder:text-white/60 resize-none font-medium leading-relaxed ${
                    textAlign === 'center' ? 'text-center' : 'text-left'
                  } ${textContent.length < 60 ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}
                />
              </div>

              {/* Canvas Controls: Colors, Fonts & Alignment */}
              <div className="space-y-3 pt-1">
                {/* Background color presets */}
                <div>
                  <span className="text-xs font-bold text-[#2D151D] block mb-1.5">
                    Background Color
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {TEXT_BACKGROUND_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedBackground(preset.value)}
                        className={`w-7 h-7 rounded-full shrink-0 ring-2 transition-transform cursor-pointer ${
                          selectedBackground === preset.value
                            ? 'ring-[#C24A68] scale-110 shadow-xs'
                            : 'ring-transparent hover:scale-105'
                        }`}
                        style={{ background: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Font and Alignment Bar */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 bg-white/90 p-1 rounded-xl border border-[#F5BAC6]">
                    {(['sans', 'serif', 'mono'] as const).map((font) => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setSelectedFont(font)}
                        className={`px-2.5 py-1 text-xs rounded-lg uppercase font-bold transition cursor-pointer ${
                          selectedFont === font
                            ? 'bg-[#C24A68] text-white shadow-2xs'
                            : 'text-[#7C5362] hover:text-[#2D151D]'
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-[#F5BAC6]">
                    <button
                      type="button"
                      onClick={() => setTextAlign('center')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        textAlign === 'center' ? 'bg-[#C24A68] text-white' : 'text-[#7C5362]'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign('left')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        textAlign === 'left' ? 'bg-[#C24A68] text-white' : 'text-[#7C5362]'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. LINK STORY TAB */}
          {activeType === 'link' && (
            <div className="space-y-4">
              {/* Link Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D151D]">
                  Website or Resource URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C5362]" />
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362] transition"
                  />
                </div>
              </div>

              {/* Link Title / Label */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D151D]">
                  Link Label / Sticker Title
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="e.g. Read the announcement, Visit Portfolio"
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362] transition"
                />
              </div>

              {/* Optional Note / Caption */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D151D]">
                  Add a comment (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Why are you sharing this link?"
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362] transition"
                />
              </div>

              {/* Link Story Live Preview Card */}
              {linkUrl && (
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#681932] to-[#2D151D] text-white flex items-center justify-between gap-3 shadow-md border border-[#F5BAC6]/40">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#FCE7EC]">
                      Link Sticker
                    </span>
                    <h5 className="text-xs font-bold truncate mt-0.5">
                      {linkTitle || 'Tap to visit'}
                    </h5>
                    <p className="text-[12px] opacity-80 truncate mt-0.5">{linkUrl}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4 text-[#FCE7EC]" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploadingMedia && (
            <div className="p-3 rounded-xl bg-[#FCE7EC] text-xs text-[#9F2241] border border-[#F5BAC6] space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>Uploading media file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#C24A68] h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating || isUploadingMedia}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || isUploadingMedia}
              className="px-5 py-2.5 rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isCreating || isUploadingMedia ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Share Story</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
