import { useCallback, useState } from 'react';
import { UploadCloud, X, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface DropzoneError {
  fileName: string;
  message: string;
}

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function Dropzone({ onFilesSelected, disabled, className }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<DropzoneError[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: DropzoneError[] } => {
    const valid: File[] = [];
    const errors: DropzoneError[] = [];

    for (const file of files) {
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push({ fileName: file.name, message: 'File harus berformat PDF' });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          fileName: file.name,
          message: `File melebihi batas 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        });
        continue;
      }

      valid.push(file);
    }

    if (valid.length + selectedFiles.length > MAX_FILES) {
      const excess = valid.length + selectedFiles.length - MAX_FILES;
      const removed = valid.splice(-excess);
      for (const file of removed) {
        errors.push({
          fileName: file.name,
          message: `Melebihi batas maksimal ${MAX_FILES} file`,
        });
      }
    }

    return { valid, errors };
  }, [selectedFiles.length]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const { valid, errors: newErrors } = validateFiles(fileArray);

    if (valid.length > 0) {
      setSelectedFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    }

    setErrors(newErrors);
  }, [validateFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value agar bisa upload file yang sama lagi
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setSelectedFiles([]);
      setErrors([]);
    }
  }, [selectedFiles, onFilesSelected]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-brand-blue bg-brand-blue-50/50'
            : 'border-slate-300 bg-white/70 hover:border-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue mb-4">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h3 className="text-base font-serif font-semibold text-brand-dark mb-1">
          Tarik dan lepas file PDF ke sini
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Maksimal {MAX_FILES} file PDF per batch, masing-masing maksimal 10 MB.
          Seluruh proses dilakukan secara online tanpa perlu mencetak formulir kertas.
        </p>
        <label className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-brand-blue text-white hover:bg-brand-blue/90 cursor-pointer'
        )}>
          <input
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
          Pilih File dari Perangkat
        </label>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-brand-dark">
              File Terpilih ({selectedFiles.length}/{MAX_FILES})
            </h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Hapus Semua
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-slate-50 rounded"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-slate-600 shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={disabled || selectedFiles.length === 0}
            className="mt-4 w-full px-4 py-2 bg-brand-blue text-white rounded-lg font-medium text-sm hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Unggah {selectedFiles.length} File
          </button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-2">
                Beberapa file tidak dapat diunggah:
              </h4>
              <ul className="space-y-1 text-xs text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>
                    <span className="font-medium">{error.fileName}:</span> {error.message}
                  </li>
                ))}
              </ul>
              <button
                onClick={clearErrors}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
