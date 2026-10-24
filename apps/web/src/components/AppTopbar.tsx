import { Link, useLocation } from 'react-router-dom';
import type { Me } from '@skem/shared';
import { Bell, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { SimulasiBadge } from './SimulasiBadge';
import { ROLE_NAV, ROLE_SWITCH, crumbFor, isNavItemActive } from './nav-config';

export interface AppTopbarProps {
  user: Me;
  onLogout: () => void;
}

export function AppTopbar({ user, onLogout }: AppTopbarProps) {
  const { pathname } = useLocation();
  const nav = ROLE_NAV[user.role];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3.5 px-4 sm:pl-9 sm:pr-7">
        <Link to={nav.home} className="font-serif text-lg font-bold text-brand-dark lg:hidden">
          SKEM AI Co-Pilot
        </Link>
        <span className="hidden min-w-0 flex-1 truncate text-sm text-slate-600 lg:block">
          {crumbFor(user.role, pathname)}
        </span>
        <span className="flex-1 lg:hidden" />

        <SimulasiBadge size="sm" note="Sistem prototipe menggunakan data sintetis" />

        <button
          type="button"
          aria-label="Notifikasi dalam aplikasi"
          title="Notifikasi dalam aplikasi"
          className="relative grid h-10 w-10 flex-none place-items-center rounded-full border border-slate-200 bg-white text-brand-dark transition-colors hover:bg-brand-bg"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-terracotta ring-2 ring-white" />
        </button>

        <div
          title="Ganti akun (mock login)"
          className="hidden flex-none gap-0.5 rounded-full bg-emerald-50 p-[3px] md:flex"
        >
          {ROLE_SWITCH.map((role) => {
            const active = role.id === user.role;
            const Icon = role.icon;
            return (
              <Link
                key={role.id}
                to="/login"
                title={`Masuk sebagai ${role.label}`}
                className={cn(
                  'flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold transition-colors',
                  active ? 'bg-brand-blue text-white' : 'text-slate-700 hover:text-brand-blue',
                )}
              >
                <Icon className="h-4 w-4" />
                {role.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Keluar"
          title="Keluar"
          className="grid h-10 w-10 flex-none place-items-center rounded-full text-slate-600 transition-colors hover:bg-brand-bg lg:hidden"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Navigasi ringkas untuk layar tanpa sidebar */}
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
        {nav.items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm',
              isNavItemActive(item, pathname)
                ? 'bg-brand-blue-100 font-bold text-brand-blue-600'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
