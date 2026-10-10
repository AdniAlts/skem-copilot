import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      // Fokuskan kontainer modal saat terbuka jika belum ada elemen fokus di dalam
      const timer = setTimeout(() => {
        if (
          modalContainerRef.current &&
          !modalContainerRef.current.contains(document.activeElement)
        ) {
          const focusable = modalContainerRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable) {
            focusable.focus();
          } else {
            modalContainerRef.current.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = '';
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap focus di dalam modal ketika menekan Tab / Shift+Tab
      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className={cn(
          'relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto outline-none',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-lg font-serif font-semibold text-brand-dark">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
