import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@skem/shared';
import { useAuth } from '../api/auth-context';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Guard rute berdasarkan peran user.
 *
 * - Jika belum login → redirect ke /login
 * - Jika peran tidak sesuai → redirect ke beranda peran user
 * - Jika loading → tampilkan loading state
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">Memuat...</div>
      </div>
    );
  }

  // Belum login → redirect ke /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Peran tidak sesuai → redirect ke beranda peran user
  if (!allowedRoles.includes(user.role)) {
    const roleHomePath = getRoleHomePath(user.role);
    return <Navigate to={roleHomePath} replace />;
  }

  return <>{children}</>;
}

/**
 * Dapatkan path beranda berdasarkan peran.
 */
function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case 'student':
      return '/mahasiswa';
    case 'verifier':
      return '/verifikator';
    case 'validator':
      return '/validator';
    case 'unit':
      return '/unit';
    default:
      return '/login';
  }
}

/**
 * Guard untuk rute mahasiswa.
 */
export function MahasiswaGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['student']}>{children}</RoleGuard>;
}

/**
 * Guard untuk rute verifikator.
 */
export function VerifikatorGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['verifier']}>{children}</RoleGuard>;
}

/**
 * Guard untuk rute validator.
 */
export function ValidatorGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['validator']}>{children}</RoleGuard>;
}

/**
 * Guard untuk rute unit.
 */
export function UnitGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['unit']}>{children}</RoleGuard>;
}
