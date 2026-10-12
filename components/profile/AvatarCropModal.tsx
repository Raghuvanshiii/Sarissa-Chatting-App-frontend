'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Check, 
  Loader2, 
  Move, 
  Crop,
  Camera,
  Sparkles
} from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => Promise<void>;
  isUploading?: boolean;
}

const VIEWPORT_SIZE = 260; // Diameter of the crop circle in px
const EXPORT_SIZE = 400;   // High resolution export size in px

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
  isUploading = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Reset adjustments whenever a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgNaturalSize({ width: naturalWidth, height: naturalHeight });
  };

  // Drag / Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUploading) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isUploading) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
  };

  // Zoom controls
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  const zoomIn = () => setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)));
  const zoomOut = () => setZoom((prev) => Math.max(1, +(prev - 0.15).toFixed(2)));

  // Rotation controls
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // Crop & Export to Blob
  const handleApplyCrop = useCallback(async () => {
    if (!imgRef.current || !imgNaturalSize) return;

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate base fitted size inside the VIEWPORT_SIZE box
    let baseW = VIEWPORT_SIZE;
    let baseH = VIEWPORT_SIZE;
    const aspect = imgNaturalSize.width / imgNaturalSize.height;

    if (aspect > 1) {
      baseH = VIEWPORT_SIZE;
      baseW = VIEWPORT_SIZE * aspect;
    } else {
      baseW = VIEWPORT_SIZE;
      baseH = VIEWPORT_SIZE / aspect;
    }

    const scaleFactor = EXPORT_SIZE / VIEWPORT_SIZE;

    // Smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply transformations matching the preview viewport
    ctx.save();
    ctx.translate(EXPORT_SIZE / 2, EXPORT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

    // Draw the image centered
    const drawW = baseW * scaleFactor;
    const drawH = baseH * scaleFactor;
    ctx.drawImage(imgRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          await onConfirm(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  }, [imgNaturalSize, rotation, zoom, pan, onConfirm]);

  if (!isOpen || !imageSrc) return null;

  // Compute CSS sizing for image display
  let baseStyleW = `${VIEWPORT_SIZE}px`;
  let baseStyleH = `${VIEWPORT_SIZE}px`;
  if (imgNaturalSize) {
    const aspect = imgNaturalSize.width / imgNaturalSize.height;
    if (aspect > 1) {
      baseStyleH = `${VIEWPORT_SIZE}px`;
      baseStyleW = `${VIEWPORT_SIZE * aspect}px`;
    } else {
      baseStyleW = `${VIEWPORT_SIZE}px`;
      baseStyleH = `${VIEWPORT_SIZE / aspect}px`;
    }
  }

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={!isUploading ? onClose : undefined}
    >
      <div 
        className="w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-[#2D151D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-2xs">
              <Crop className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D151D]">
                Adjust & Crop Profile Photo
              </h3>
              <p className="text-xs text-[#7C5362]">
                Drag to reposition, zoom or rotate to preview your final look
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="p-2 rounded-xl text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer disabled:opacity-50"
            title="Cancel selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Stage Area */}
        <div className="p-6 flex flex-col items-center select-none bg-[#FFF0F3]">
          <div 
            className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#2D151D] shadow-[0_12px_36px_rgba(0,0,0,0.25)]"
            style={{ width: `${VIEWPORT_SIZE + 40}px`, height: `${VIEWPORT_SIZE + 40}px` }}
            onWheel={handleWheel}
          >
            {/* The Image inside the viewport */}
            <div 
              className="absolute cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-auto"
              style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop Target"
                onLoad={handleImageLoad}
                draggable={false}
                className="max-w-none select-none pointer-events-none transition-transform duration-75 ease-out"
                style={{
                  width: baseStyleW,
                  height: baseStyleH,
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              />
            </div>

            {/* Circular Mask Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at center, transparent ${VIEWPORT_SIZE / 2 - 1}px, rgba(45, 21, 29, 0.85) ${VIEWPORT_SIZE / 2}px)`,
              }}
            >
              {/* Circular Border Ring with Gloss */}
              <div 
                className="rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(194,74,104,0.5),0_0_24px_rgba(194,74,104,0.4)] relative"
                style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
              >
                {/* Crosshairs guide hint */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/20 border-dashed pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-white/20 border-dashed pointer-events-none" />
              </div>
            </div>

            {/* Move Hint Overlay Icon */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[11px] text-white/90 pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Drag to position</span>
            </div>
          </div>

          {/* Interactive Adjustment Controls */}
          <div className="w-full mt-5 space-y-3.5">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 px-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 1 || isUploading}
                className="p-1.5 rounded-xl bg-white border border-[#F5BAC6] hover:bg-[#FFEBF0] text-[#C24A68] disabled:opacity-40 transition cursor-pointer shadow-2xs"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={handleZoomChange}
                  disabled={isUploading}
                  className="w-full h-1.5 bg-[#FCE7EC] rounded-lg appearance-none cursor-pointer accent-[#C24A68] focus:outline-none"
                />
                <span className="text-[12px] font-mono font-bold text-[#7C5362] w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 3 || isUploading}
                className="p-1.5 rounded-xl bg-white border border-[#F5BAC6] hover:bg-[#FFEBF0] text-[#C24A68] disabled:opacity-40 transition cursor-pointer shadow-2xs"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate and Reset Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-[#F5BAC6]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={rotateClockwise}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#F5BAC6] hover:bg-[#FFEBF0] text-xs font-semibold text-[#2D151D] transition cursor-pointer shadow-2xs"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#C24A68]" />
                  <span>Rotate 90°</span>
                </button>

                {(zoom > 1 || rotation !== 0 || pan.x !== 0 || pan.y !== 0) && (
                  <button
                    type="button"
                    onClick={resetTransform}
                    disabled={isUploading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FFEBF0] transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="text-[12px] text-[#7C5362] flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-[#C24A68]" />
                <span>Circle Preview</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-[#F5BAC6] bg-[#FFEBF0]/70 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="py-2.5 px-5 rounded-2xl border border-[#F5BAC6] text-xs font-semibold text-[#7C5362] hover:text-[#2D151D] hover:bg-white transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={handleApplyCrop}
            className="py-2.5 px-6 rounded-2xl bg-[#C24A68] hover:bg-[#B83253] text-white font-bold text-xs shadow-md flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Avatar...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
