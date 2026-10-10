import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SimulasiBadge } from '../components/SimulasiBadge';
import { GraduationCap, UserCheck, ShieldCheck, BarChart3, LogIn } from 'lucide-react';
import { useAuth } from '../api/auth-context';
import type { UserRole } from '@skem/shared';

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  student: GraduationCap,
  verifier: UserCheck,
  validator: ShieldCheck,
  unit: BarChart3,
};

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Mahasiswa',
  verifier: 'Verifikator',
  validator: 'Validator',
  unit: 'Unit Kemahasiswaan',
};

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  student: '/mahasiswa',
  verifier: '/verifikator',
  validator: '/validator',
  unit: '/unit',
};

export function LoginRoute() {
  const { mockUsers, login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jika sudah login, redirect ke beranda peran
  if (isAuthenticated && user) {
    const from = (location.state as { from?: { pathname: string } })?.from;
    const redirectTo = from?.pathname || ROLE_HOME_PATHS[user.role];
    navigate(redirectTo, { replace: true });
    return null;
  }

  // Group users by role
  const usersByRole = mockUsers.reduce(
    (acc, mockUser) => {
      if (!acc[mockUser.role]) {
        acc[mockUser.role] = [];
      }
      acc[mockUser.role].push(mockUser);
      return acc;
    },
    {} as Record<UserRole, typeof mockUsers>
  );

  const handleLogin = async (userId: number, role: UserRole) => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await login(userId);
      navigate(ROLE_HOME_PATHS[role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk. Silakan coba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <h1 className="text-3xl font-serif font-bold text-brand-dark">
            Masuk ke SKEM AI Co-Pilot
          </h1>
          <SimulasiBadge />
        </div>
        <p className="text-sm text-slate-600">
          Pilih akun untuk masuk ke sistem (Mock Login Simulasi).
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {mockUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-sm text-slate-500">Memuat daftar akun...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(usersByRole) as UserRole[]).map((role) => {
            const Icon = ROLE_ICONS[role];
            const users = usersByRole[role];

            return (
              <div key={role}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-brand-blue-50 text-brand-blue">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-brand-dark">
                    {ROLE_LABELS[role]}
                  </h2>
                  <span className="text-xs text-slate-500">({users.length} akun)</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {users.map((mockUser) => (
                    <Card key={mockUser.id} variant="interactive" className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-sm text-brand-dark">
                            {mockUser.name}
                          </div>
                          {mockUser.className && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {mockUser.className}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-center"
                        onClick={() => handleLogin(mockUser.id, role)}
                        disabled={isLoggingIn}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Masuk
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <strong>Catatan:</strong> Ini adalah sistem simulasi untuk demo. Semua data bersifat sintetis
        dan tidak terhubung ke sistem SKEM PENS yang sebenarnya.
      </div>
    </div>
  );
}
