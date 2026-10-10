import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginRoute } from './routes/login';
import { MahasiswaDashboardRoute } from './routes/mahasiswa/index';
import { MahasiswaUploadRoute } from './routes/mahasiswa/upload';
import { MahasiswaDetailRoute } from './routes/mahasiswa/detail';
import { MahasiswaProfileRoute } from './routes/mahasiswa/profile';
import { VerifikatorQueueRoute } from './routes/verifikator/index';
import { VerifikatorDetailRoute } from './routes/verifikator/detail';
import { VerifikatorSettingsRoute } from './routes/verifikator/settings';
import { ValidatorQueueRoute } from './routes/validator/index';
import { ValidatorDetailRoute } from './routes/validator/detail';
import { UnitMonitoringRoute } from './routes/unit/index';
import { DevKomponenRoute } from './routes/dev/komponen';
import { EmptyState } from './components/EmptyState';
import { Button } from './components/Button';
import { ErrorBoundary } from './components/ErrorBoundary';
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
        <Route
          path="/login"
          element={
            <ErrorBoundary fallbackTitle="Kendala Halaman Masuk">
              <LoginRoute />
            </ErrorBoundary>
          }
        />

        {/* Rute Mahasiswa */}
        <Route
          path="/mahasiswa"
          element={
            <MahasiswaGuard>
              <ErrorBoundary fallbackTitle="Kendala Beranda Mahasiswa">
                <MahasiswaDashboardRoute />
              </ErrorBoundary>
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/unggah"
          element={
            <MahasiswaGuard>
              <ErrorBoundary fallbackTitle="Kendala Halaman Unggah">
                <MahasiswaUploadRoute />
              </ErrorBoundary>
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/detail/:id"
          element={
            <MahasiswaGuard>
              <ErrorBoundary fallbackTitle="Kendala Rincian Pengajuan">
                <MahasiswaDetailRoute />
              </ErrorBoundary>
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/pengajuan/:id"
          element={
            <MahasiswaGuard>
              <ErrorBoundary fallbackTitle="Kendala Rincian Pengajuan">
                <MahasiswaDetailRoute />
              </ErrorBoundary>
            </MahasiswaGuard>
          }
        />
        <Route
          path="/mahasiswa/profil"
          element={
            <MahasiswaGuard>
              <ErrorBoundary fallbackTitle="Kendala Profil Mahasiswa">
                <MahasiswaProfileRoute />
              </ErrorBoundary>
            </MahasiswaGuard>
          }
        />

        {/* Rute Verifikator (Dosen Wali) */}
        <Route
          path="/verifikator"
          element={
            <VerifikatorGuard>
              <ErrorBoundary fallbackTitle="Kendala Antrian Verifikator">
                <VerifikatorQueueRoute />
              </ErrorBoundary>
            </VerifikatorGuard>
          }
        />
        <Route
          path="/verifikator/detail/:id"
          element={
            <VerifikatorGuard>
              <ErrorBoundary fallbackTitle="Kendala Pemeriksaan Pengajuan">
                <VerifikatorDetailRoute />
              </ErrorBoundary>
            </VerifikatorGuard>
          }
        />
        <Route
          path="/verifikator/pengaturan"
          element={
            <VerifikatorGuard>
              <ErrorBoundary fallbackTitle="Kendala Pengaturan Verifikator">
                <VerifikatorSettingsRoute />
              </ErrorBoundary>
            </VerifikatorGuard>
          }
        />

        {/* Rute Validator */}
        <Route
          path="/validator"
          element={
            <ValidatorGuard>
              <ErrorBoundary fallbackTitle="Kendala Antrian Validator">
                <ValidatorQueueRoute />
              </ErrorBoundary>
            </ValidatorGuard>
          }
        />
        <Route
          path="/validator/detail/:id"
          element={
            <ValidatorGuard>
              <ErrorBoundary fallbackTitle="Kendala Validasi Pengajuan">
                <ValidatorDetailRoute />
              </ErrorBoundary>
            </ValidatorGuard>
          }
        />

        {/* Rute Unit Kemahasiswaan */}
        <Route
          path="/unit"
          element={
            <UnitGuard>
              <ErrorBoundary fallbackTitle="Kendala Monitoring Kemahasiswaan">
                <UnitMonitoringRoute />
              </ErrorBoundary>
            </UnitGuard>
          }
        />

        {/* Showcase Komponen UI */}
        <Route
          path="/dev/komponen"
          element={
            <ErrorBoundary fallbackTitle="Kendala Komponen Showcase">
              <DevKomponenRoute />
            </ErrorBoundary>
          }
        />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
