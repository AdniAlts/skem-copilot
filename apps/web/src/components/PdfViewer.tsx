import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export interface PdfViewerProps {
  url: string;
  className?: string;
  onRefreshUrl?: () => void;
  fileName?: string;
}

export function PdfViewer({ url, className, onRefreshUrl, fileName }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const handleRefresh = async () => {
    if (onRefreshUrl) {
      setIsRefreshing(true);
      try {
        await onRefreshUrl();
        setHasError(false);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className={cn('flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 shadow-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="h-7 w-7 p-0 border-0"
              title="Perkecil"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono text-slate-700 min-w-[2.75rem] text-center select-none">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="h-7 w-7 p-0 border-0"
              title="Perbesar"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              disabled={zoom === 100}
              className="h-7 w-7 p-0 border-0"
              title="Atur ulang zoom (100%)"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRefreshUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 px-2 text-xs flex items-center gap-1"
              title="Segarkan tautan berkas (jika masa berlaku habis)"
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-teal px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              title="Buka di tab baru"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
          )}
        </div>
      </div>

      {/* PDF View Container */}
      <div className="flex-1 overflow-auto bg-slate-100/80 p-3 min-h-[450px] flex items-center justify-center">
        {hasError ? (
          <div className="text-center p-6 bg-white rounded-lg border border-red-200 max-w-sm">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              Gagal Memuat Berkas PDF
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Tautan unduhan mungkin telah kedaluwarsa atau berkas tidak dapat diakses langsung oleh peramban.
            </p>
            {onRefreshUrl && (
              <Button variant="primary" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? 'Memperbarui...' : 'Perbarui Tautan'}
              </Button>
            )}
          </div>
        ) : url ? (
          <div
            className="bg-white shadow-md mx-auto transition-all duration-150 rounded"
            style={{ width: `${zoom}%`, maxWidth: '100%' }}
          >
            <iframe
              src={url}
              className="w-full h-[620px] rounded border-0"
              title={fileName || 'Pratinjau Sertifikat PDF'}
              onError={() => setHasError(true)}
            />
          </div>
        ) : (
          <div className="text-center p-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-xs">Berkas PDF sertifikat sedang disiapkan...</p>
          </div>
        )}
      </div>
    </div>
  );
}
