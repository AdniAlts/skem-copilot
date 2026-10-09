import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { SimulasiBadge } from '../components/SimulasiBadge';
import { GraduationCap, UserCheck, ShieldCheck, BarChart3 } from 'lucide-react';

export function LoginRoute() {
  const roles = [
    {
      title: 'Mahasiswa',
      desc: 'Pengajuan SKEM, cek status, dan unggah sertifikat batch',
      path: '/mahasiswa',
      icon: GraduationCap,
    },
    {
      title: 'Verifikator (Dosen Wali)',
      desc: 'Pemeriksaan pengajuan kelas dan persetujuan e-sign',
      path: '/verifikator',
      icon: UserCheck,
    },
    {
      title: 'Validator / Admin SKEM',
      desc: 'Validasi administratif dan finalisasi kredit final',
      path: '/validator',
      icon: ShieldCheck,
    },
    {
      title: 'Unit Kemahasiswaan',
      desc: 'Monitoring pelaksanaan SKEM read-only',
      path: '/unit',
      icon: BarChart3,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <h1 className="text-3xl font-serif font-bold text-brand-dark">
            Masuk ke SKEM AI Co-Pilot
          </h1>
          <SimulasiBadge />
        </div>
        <p className="text-sm text-slate-600">
          Pilih salah satu peran untuk masuk ke sistem (Mock Login Simulasi).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.path} variant="interactive" className="flex flex-col justify-between">
            <div>
              <CardHeader className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-50 text-brand-teal">
                    <role.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">{role.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 mb-4">{role.desc}</CardContent>
            </div>
            <Link to={role.path}>
              <Button variant="outline" size="sm" className="w-full justify-center">
                Pilih Peran Ini
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
