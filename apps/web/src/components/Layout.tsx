import React from 'react';
import { Header } from './Header';
import { ToastProvider } from './Toast';

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-dark antialiased">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white/50 py-4 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4">
            SKEM AI Co-Pilot &bull; PENS Hackathon 2026 (Track CBN Digital Campus Worker) &bull;
            Semua proses dilakukan secara online
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
