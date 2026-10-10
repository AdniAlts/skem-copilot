import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, GraduationCap, ShieldCheck, UserCheck, BarChart3, ChevronDown, LogOut, User } from 'lucide-react';
import { SimulasiBadge } from './SimulasiBadge';
import { cn } from '../lib/utils';
import { useAuth } from '../api/auth-context';

const ROLES = [
  { id: 'student', label: 'Mahasiswa', path: '/mahasiswa', icon: GraduationCap },
  { id: 'verifier', label: 'Verifikator (Dosen Wali)', path: '/verifikator', icon: UserCheck },
  { id: 'validator', label: 'Validator', path: '/validator', icon: ShieldCheck },
  { id: 'unit', label: 'Unit Kemahasiswaan', path: '/unit', icon: BarChart3 },
] as const;

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Tentukan peran aktif berdasarkan user yang login
  const currentRole = user
    ? ROLES.find((r) => r.id === user.role) ?? ROLES[0]
    : ROLES.find((r) => location.pathname.startsWith(r.path)) ?? ROLES[0];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b-[3px] border-brand-yellow bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Sisi Kiri: Logo & Navigasi */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-serif text-xl font-bold tracking-tight text-brand-dark group-hover:text-brand-blue transition-colors">
              SKEM AI Co-Pilot
            </span>
            <SimulasiBadge size="sm" note="Sistem prototipe menggunakan data sintetis" />
          </Link>

          {/* Navigasi Peran yang sedang dipilih */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              {location.pathname.startsWith('/mahasiswa') && (
                <>
                  <Link
                    to="/mahasiswa"
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      location.pathname === '/mahasiswa'
                        ? 'bg-brand-blue-50 text-brand-blue font-semibold'
                        : 'text-slate-600 hover:text-brand-dark hover:bg-slate-50',
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/mahasiswa/unggah"
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      location.pathname.startsWith('/mahasiswa/unggah')
                        ? 'bg-brand-blue-50 text-brand-blue font-semibold'
                        : 'text-slate-600 hover:text-brand-dark hover:bg-slate-50',
                    )}
                  >
                    Unggah Sertifikat
                  </Link>
                  <Link
                    to="/mahasiswa/profil"
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      location.pathname === '/mahasiswa/profil'
                        ? 'bg-brand-blue-50 text-brand-blue font-semibold'
                        : 'text-slate-600 hover:text-brand-dark hover:bg-slate-50',
                    )}
                  >
                    Profil
                  </Link>
                </>
              )}

              {location.pathname.startsWith('/verifikator') && (
                <>
                  <Link
                    to="/verifikator"
                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${!location.pathname.startsWith('/verifikator/pengaturan') ? 'bg-brand-blue-50 text-brand-blue' : 'text-slate-600 hover:text-brand-blue'}`}
                  >
                    Antrian Kelas
                  </Link>
                  <Link
                    to="/verifikator/pengaturan"
                    className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${location.pathname.startsWith('/verifikator/pengaturan') ? 'bg-brand-blue-50 text-brand-blue' : 'text-slate-600 hover:text-brand-blue'}`}
                  >
                    Tanda Tangan
                  </Link>
                </>
              )}

              {location.pathname.startsWith('/validator') && (
                <Link
                  to="/validator"
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand-blue-50 text-brand-blue"
                >
                  Antrian Lintas Kelas
                </Link>
              )}

              {location.pathname.startsWith('/unit') && (
                <Link
                  to="/unit"
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand-blue-50 text-brand-blue"
                >
                  Monitoring
                </Link>
              )}

              <Link
                to="/dev/komponen"
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                  location.pathname === '/dev/komponen' && 'bg-amber-50 text-amber-900 font-semibold',
                )}
              >
                Dev Komponen
              </Link>
            </nav>
          )}
        </div>

        {/* Sisi Kanan: User Info & Menu */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user && (
            <>
              {/* Lonceng Notifikasi */}
              <button
                type="button"
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
                aria-label="Notifikasi"
                title="Notifikasi dalam aplikasi"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-blue ring-2 ring-white" />
              </button>

              {/* User Menu */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <currentRole.icon className="h-4 w-4 text-brand-blue" />
                  <span className="hidden sm:inline">{user.name}</span>
                  <span className="sm:hidden">{currentRole.label.split(' ')[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1.5 hidden w-64 rounded-card border border-slate-200 bg-white p-1.5 shadow-lg group-hover:block z-50">
                  <div className="px-2.5 py-2 border-b border-slate-100 mb-1.5">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-slate-400" />
                      <div>
                        <div className="text-sm font-semibold text-brand-dark">{user.name}</div>
                        <div className="text-xs text-slate-500">
                          {currentRole.label}
                          {user.className && ` • ${user.className}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Ganti Akun (Mock)
                  </div>
                  {ROLES.map((role) => (
                    <Link
                      key={role.id}
                      to="/login"
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm transition-colors',
                        currentRole.id === role.id
                          ? 'bg-brand-blue-50 font-semibold text-brand-blue'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-brand-dark',
                      )}
                    >
                      <role.icon className="h-4 w-4 text-slate-500" />
                      <span>{role.label}</span>
                    </Link>
                  ))}

                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 transition-colors"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
