import {
  BarChart3,
  FileUp,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  PenLine,
  ShieldCheck,
  UserCheck,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@skem/shared';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Aktif hanya jika path sama persis (bukan awalan). */
  exact?: boolean;
  /** Awalan path yang tidak membuat item ini aktif. */
  excludePrefix?: string;
}

export interface RoleNav {
  title: string;
  home: string;
  items: NavItem[];
}

export const ROLE_NAV: Record<UserRole, RoleNav> = {
  student: {
    title: 'Mahasiswa',
    home: '/mahasiswa',
    items: [
      { label: 'Dashboard', to: '/mahasiswa', icon: LayoutDashboard, exact: true },
      { label: 'Unggah Sertifikat', to: '/mahasiswa/unggah', icon: FileUp },
      { label: 'Profil', to: '/mahasiswa/profil', icon: UserRound },
    ],
  },
  verifier: {
    title: 'Verifikator · dosen wali',
    home: '/verifikator',
    items: [
      {
        label: 'Antrian Kelas',
        to: '/verifikator',
        icon: Inbox,
        excludePrefix: '/verifikator/pengaturan',
      },
      { label: 'Tanda Tangan', to: '/verifikator/pengaturan', icon: PenLine },
    ],
  },
  validator: {
    title: 'Validator',
    home: '/validator',
    items: [{ label: 'Antrian Lintas Kelas', to: '/validator', icon: ShieldCheck }],
  },
  unit: {
    title: 'Unit Kemahasiswaan',
    home: '/unit',
    items: [{ label: 'Monitoring', to: '/unit', icon: BarChart3 }],
  },
};

export const DEV_NAV_ITEM: NavItem = {
  label: 'Dev Komponen',
  to: '/dev/komponen',
  icon: Wrench,
};

export const ROLE_SWITCH = [
  { id: 'student', label: 'Mahasiswa', icon: GraduationCap },
  { id: 'verifier', label: 'Verifikator', icon: UserCheck },
  { id: 'validator', label: 'Validator', icon: ShieldCheck },
  { id: 'unit', label: 'Unit', icon: BarChart3 },
] as const satisfies ReadonlyArray<{ id: UserRole; label: string; icon: LucideIcon }>;

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.excludePrefix && pathname.startsWith(item.excludePrefix)) return false;
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

/** Teks breadcrumb topbar dari item navigasi yang aktif. */
export function crumbFor(role: UserRole, pathname: string): string {
  const items = [...ROLE_NAV[role].items, DEV_NAV_ITEM];
  const active = items.find((item) => isNavItemActive(item, pathname));
  // Halaman rincian yang tidak punya item navigasi sendiri (mis. /mahasiswa/detail/:id).
  if (!active) {
    const [home] = ROLE_NAV[role].items;
    return home && pathname.startsWith(home.to)
      ? `${home.label} / Rincian pengajuan`
      : ROLE_NAV[role].title;
  }
  return pathname === active.to ? active.label : `${active.label} / Rincian pengajuan`;
}
