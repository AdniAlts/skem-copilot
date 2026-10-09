import { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Upload, Trash2, AlertCircle, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export interface SignaturePadProps {
  onSave: (signatureData: { dataUrl: string; file?: File }) => Promise<void> | void;
  onCancel?: () => void;
  isSaving?: boolean;
  className?: string;
}

export function SignaturePad({ onSave, onCancel, isSaving = false, className }: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Setup Canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // slate-900
  }, []);

  useEffect(() => {
    if (activeTab === 'draw') {
      // Delay slightly to ensure canvas is mounted and measured
      const timer = setTimeout(setupCanvas, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, setupCanvas]);

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return { x: 0, y: 0 };
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setDrawError(null);
    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setDrawError(null);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate type (must be PNG)
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setUploadError('Format berkas harus berupa PNG (disarankan dengan latar transparan).');
      return;
    }

    // Validate size (max 1 MB)
    if (file.size > 1024 * 1024) {
      setUploadError('Ukuran berkas tanda tangan maksimal 1 MB.');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (activeTab === 'draw') {
      if (!hasDrawn || !canvasRef.current) {
        setDrawError('Silakan buat tanda tangan Anda terlebih dahulu pada kanvas.');
        return;
      }
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSave({ dataUrl });
    } else {
      if (!uploadedFile || !previewUrl) {
        setUploadError('Silakan pilih berkas tanda tangan PNG terlebih dahulu.');
        return;
      }
      await onSave({ dataUrl: previewUrl, file: uploadedFile });
    }
  };

  return (
    <div className={cn('space-y-4 text-xs text-slate-700', className)}>
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={cn(
            'flex items-center gap-2 py-2.5 px-4 font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'draw'
              ? 'border-brand-teal text-brand-teal font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Gambar di sini</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            'flex items-center gap-2 py-2.5 px-4 font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'upload'
              ? 'border-brand-teal text-brand-teal font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Unggah gambar (PNG)</span>
        </button>
      </div>

      {/* Tab 1: Draw on Canvas */}
      {activeTab === 'draw' && (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50 p-2 overflow-hidden hover:border-slate-400 transition-colors">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 bg-white rounded cursor-crosshair touch-none border border-slate-200"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                <span>Goreskan tanda tangan Anda di area ini</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Gunakan mouse, touchpad, atau stylus untuk menggambar.</span>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawn || isSaving}
              className="flex items-center gap-1 text-slate-500 hover:text-red-600 disabled:opacity-40 transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          {drawError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{drawError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Upload PNG */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-slate-50/50 hover:border-brand-teal transition-colors">
            <input
              type="file"
              accept=".png,image/png"
              id="signature-file-upload"
              onChange={handleFileChange}
              disabled={isSaving}
              className="hidden"
            />
            <label htmlFor="signature-file-upload" className="cursor-pointer block space-y-2">
              <div className="p-3 bg-white w-12 h-12 rounded-full border border-slate-200 shadow-2xs mx-auto flex items-center justify-center text-slate-500">
                <ImageIcon className="w-6 h-6 text-brand-teal" />
              </div>
              <div>
                <span className="font-semibold text-brand-teal hover:underline block text-xs">
                  {uploadedFile ? uploadedFile.name : 'Pilih berkas PNG tanda tangan'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Format PNG transparan, ukuran maksimal 1 MB
                </span>
              </div>
            </label>
          </div>

          {previewUrl && (
            <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center gap-3">
              <div className="w-24 h-16 border border-slate-200 rounded bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                <img
                  src={previewUrl}
                  alt="Pratinjau Tanda Tangan"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-800 block truncate">
                  {uploadedFile?.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {uploadedFile && (uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setPreviewUrl(null);
                }}
                disabled={isSaving}
                className="text-slate-400 hover:text-red-600 p-1"
                title="Hapus berkas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info & Action Buttons */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500">
          Tanda tangan disimpan sekali dan digunakan untuk pengajuan selanjutnya.
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Batal
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={
              isSaving ||
              (activeTab === 'draw' && !hasDrawn) ||
              (activeTab === 'upload' && !uploadedFile)
            }
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
