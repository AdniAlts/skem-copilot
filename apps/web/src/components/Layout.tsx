import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/auth-context';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { SimulasiBadge } from './SimulasiBadge';
import { ToastProvider } from './Toast';

export interface LayoutProps {
  children: React.ReactNode;
}

function Footer() {
  return (
    <footer className="px-4 pb-6 text-center text-xs text-slate-400 sm:px-9">
      SKEM AI Co-Pilot &bull; PENS Hackathon 2026 (Track CBN Digital Campus Worker) &bull; Semua
      proses dilakukan secara online
    </footer>
  );
}

function PublicTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-9">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="font-serif text-xl font-bold text-brand-dark">SKEM AI Co-Pilot</span>
          <SimulasiBadge size="sm" note="Sistem prototipe menggunakan data sintetis" />
        </Link>
        <Link
          to="/login"
          className="inline-flex h-10 items-center rounded-[10px] bg-brand-blue px-4 text-sm font-bold text-white transition-colors hover:bg-brand-blue-700"
        >
          Masuk
        </Link>
      </div>
    </header>
  );
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-brand-bg font-sans text-brand-dark antialiased">
        {user && <AppSidebar user={user} onLogout={handleLogout} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {user ? <AppTopbar user={user} onLogout={handleLogout} /> : <PublicTopbar />}
          <main className="w-full flex-1 px-4 pb-14 pt-6 sm:px-9 sm:pt-7">{children}</main>
          <Footer />
        </div>
      </div>
    </ToastProvider>
  );
}
