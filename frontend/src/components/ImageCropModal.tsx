'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, RotateCw, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  aspect?: number;
  outputSize?: number;
  onComplete: (croppedBase64: string, mimeType: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  imageSrc,
  aspect = 1,
  outputSize = 500,
  onComplete,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, outputSize);
      onComplete(cropped, 'image/jpeg');
    } catch (err) {
      console.error('Crop failed:', err);
      alert('Could not process the image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Crop Photo</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full aspect-square bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            cropShape="round"
            showGrid={false}
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#091d64]"
              aria-label="Zoom"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Rotate 90°
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="flex-1 py-2.5 bg-[#091d64] hover:bg-[#0a2578] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {processing ? 'Saving...' : 'Use Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  outputSize: number
): Promise<string> {
  const image = await loadImage(imageSrc);
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bW, height: bH } = rotatedBounds(image.width, image.height, rotRad);

  const canvas = document.createElement('canvas');
  canvas.width = bW;
  canvas.height = bH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const out = document.createElement('canvas');
  out.width = outputSize;
  out.height = outputSize;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Output canvas unavailable');

  octx.drawImage(
    canvas,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputSize, outputSize
  );

  return out.toDataURL('image/jpeg', 0.85);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

function rotatedBounds(w: number, h: number, rad: number) {
  return {
    width: Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h),
    height: Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h),
  };
}