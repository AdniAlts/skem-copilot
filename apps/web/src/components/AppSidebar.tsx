import { Link, useLocation } from 'react-router-dom';
import type { Me } from '@skem/shared';
import { LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEV_NAV_ITEM, ROLE_NAV, isNavItemActive, type NavItem } from './nav-config';

export interface AppSidebarProps {
  user: Me;
  onLogout: () => void;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part) && !part.endsWith('.'))
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function subtitleOf(user: Me): string {
  if (user.role === 'student') {
    return [user.className, user.nrp].filter(Boolean).join(' · ');
  }
  if (user.role === 'verifier') {
    return user.className ? `Dosen wali ${user.className}` : 'Dosen wali';
  }
  return user.jabatan ?? ROLE_NAV[user.role].title;
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[42px] items-center gap-3 rounded-[10px] px-2.5 text-sm transition-colors',
        active
          ? 'bg-white/[.12] font-bold text-white shadow-[inset_3px_0_0_#F5C400]'
          : 'text-brand-sidebar-text hover:bg-white/[.09] hover:text-white',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-none',
          active ? 'text-brand-yellow' : 'text-brand-sidebar-muted',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const { pathname } = useLocation();
  const nav = ROLE_NAV[user.role];

  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar flex-none flex-col gap-6 overflow-auto bg-brand-dark px-3.5 pb-[18px] pt-6 lg:flex">
      <Link to={nav.home} className="flex flex-col gap-1 px-2.5">
        <span className="font-serif text-[19px] font-bold leading-tight text-white">
          SKEM AI Co-Pilot
        </span>
        <span className="text-xs leading-snug text-brand-sidebar-muted">
          Politeknik Elektronika Negeri Surabaya
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5" aria-label="Navigasi utama">
        <span className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-[.08em] text-brand-sidebar-label">
          {nav.title}
        </span>
        {nav.items.map((item) => (
          <SidebarLink key={item.to} item={item} active={isNavItemActive(item, pathname)} />
        ))}
        <div className="mt-3 border-t border-white/10 pt-3">
          <SidebarLink item={DEV_NAV_ITEM} active={isNavItemActive(DEV_NAV_ITEM, pathname)} />
        </div>
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-2.5 pt-3">
        <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-brand-yellow text-[13px] font-bold text-brand-dark">
          {initialsOf(user.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold text-white">{user.name}</span>
          <span className="truncate text-xs text-brand-sidebar-muted">{subtitleOf(user)}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Keluar"
          aria-label="Keluar"
          className="grid h-8 w-8 flex-none place-items-center rounded-lg text-brand-sidebar-muted transition-colors hover:bg-white/[.09] hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  );
}
