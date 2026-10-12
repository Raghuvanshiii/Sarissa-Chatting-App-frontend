'use client';

import React, { useEffect, useRef } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Camera, 
  Headphones, 
  User, 
  BarChart2, 
  Sticker, 
  Plus 
} from 'lucide-react';

export interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: () => void;
  onSelectPhotosVideos: () => void;
  onSelectCamera: () => void;
  onSelectAudio: () => void;
  onSelectContact: () => void;
  onSelectPoll: () => void;
  onSelectNewSticker: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  onSelectPhotosVideos,
  onSelectCamera,
  onSelectAudio,
  onSelectContact,
  onSelectPoll,
  onSelectNewSticker,
  anchorRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'document',
      label: 'Document',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#7F66FF]">
          <FileText className="w-5 h-5 fill-[#7F66FF]/20 stroke-[2]" />
        </div>
      ),
      action: onSelectDocument,
    },
    {
      id: 'photos_videos',
      label: 'Photos & videos',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#007BFC]">
          <ImageIcon className="w-5 h-5 fill-[#007BFC]/20 stroke-[2]" />
        </div>
      ),
      action: onSelectPhotosVideos,
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#FF2E74]">
          <Camera className="w-5 h-5 fill-[#FF2E74]/20 stroke-[2]" />
        </div>
      ),
      action: onSelectCamera,
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#FF6B00]">
          <Headphones className="w-5 h-5 fill-[#FF6B00]/20 stroke-[2]" />
        </div>
      ),
      action: onSelectAudio,
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#00A884]">
          <User className="w-5 h-5 fill-[#00A884]/20 stroke-[2]" />
        </div>
      ),
      action: onSelectContact,
    },
    {
      id: 'poll',
      label: 'Poll',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#FFBC00]">
          <BarChart2 className="w-5 h-5 fill-[#FFBC00]/20 stroke-[2] rotate-90" />
        </div>
      ),
      action: onSelectPoll,
    },
    {
      id: 'new_sticker',
      label: 'New sticker',
      icon: (
        <div className="w-6 h-6 flex items-center justify-center text-[#00A884] relative">
          <Sticker className="w-5 h-5 fill-[#00A884]/20 stroke-[2]" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00A884] rounded-full flex items-center justify-center">
            <Plus className="w-2 h-2 text-white stroke-[3]" />
          </div>
        </div>
      ),
      action: onSelectNewSticker,
    },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Attach"
      className="absolute bottom-full mb-3 left-0 sm:left-2 z-40 w-56 bg-[#FFF5F7] backdrop-blur-2xl rounded-2xl shadow-[0_12px_36px_rgba(194,74,104,0.18)] border border-[#F5BAC6] p-1.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-150 origin-bottom-left select-none text-[#2D151D]"
    >
      <div className="flex flex-col gap-0.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.action();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-[#FCE7EC] active:bg-[#FFEBF0] transition-colors cursor-pointer group text-left"
          >
            <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-150">
              {item.icon}
            </div>
            <span className="text-[14.5px] font-bold text-[#2D151D] group-hover:text-[#C24A68] transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
