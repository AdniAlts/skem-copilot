import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginRoute } from './routes/login';
import { MahasiswaDashboardRoute } from './routes/mahasiswa/index';
import { MahasiswaUploadRoute } from './routes/mahasiswa/upload';
import { MahasiswaDetailRoute } from './routes/mahasiswa/detail';
import { MahasiswaProfileRoute } from './routes/mahasiswa/profile';
import { VerifikatorQueueRoute } from './routes/verifikator/index';
import { VerifikatorDetailRoute } from './routes/verifikator/detail';
import { ValidatorQueueRoute } from './routes/validator/index';
import { ValidatorDetailRoute } from './routes/validator/detail';
import { UnitMonitoringRoute } from './routes/unit/index';
import { DevKomponenRoute } from './routes/dev/komponen';
import { EmptyState } from './components/EmptyState';
import { Button } from './components/Button';
import { Link } from 'react-router-dom';
import {
  MahasiswaGuard,
  VerifikatorGuard,
  ValidatorGuard,
  UnitGuard,
} from './components/RoleGuard';

function NotFound() {
  return (
    <div className="py-12">
      <EmptyState
        title="Halaman Tidak Ditemukan"
        description="Alamat URL yang Anda tuju tidak tersedia atau telah dipindahkan."
        action={
          <Link to="/mahasiswa">
            <Button variant="primary" size="sm">
              Kembali ke Beranda
            </Button>
          </Link>
        }
      />
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRoute />} />

        {/* Rute Mahasiswa */}
        <Route
          path="/mahasiswa"
          element={
            <MahasiswaGuard>
              <MahasiswaDashboardRoute />
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/unggah"
          element={
            <MahasiswaGuard>
              <MahasiswaUploadRoute />
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/detail/:id"
          element={
            <MahasiswaGuard>
              <MahasiswaDetailRoute />
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/profil"
          element={
            <MahasiswaGuard>
              <MahasiswaProfileRoute />
            </MahasiswaGuard>
          }
        />

        {/* Rute Verifikator (Dosen Wali) */}
        <Route
          path="/verifikator"
          element={
            <VerifikatorGuard>
              <VerifikatorQueueRoute />
            </VerifikatorGuard>
          }
        />
        <Route
          path="/verifikator/detail/:id"
          element={
            <VerifikatorGuard>
              <VerifikatorDetailRoute />
            </VerifikatorGuard>
          }
        />

        {/* Rute Validator */}
        <Route
          path="/validator"
          element={
            <ValidatorGuard>
              <ValidatorQueueRoute />
            </ValidatorGuard>
          }
        />
        <Route
          path="/validator/detail/:id"
          element={
            <ValidatorGuard>
              <ValidatorDetailRoute />
            </ValidatorGuard>
          }
        />

        {/* Rute Unit Kemahasiswaan */}
        <Route
          path="/unit"
          element={
            <UnitGuard>
              <UnitMonitoringRoute />
            </UnitGuard>
          }
        />

        {/* Showcase Komponen UI */}
        <Route path="/dev/komponen" element={<DevKomponenRoute />} />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
