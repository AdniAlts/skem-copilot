import { useEffect, useState } from 'react';
import { fetchHealth } from './api/health';

type ApiStatus = 'memeriksa' | 'ok' | 'gagal';

export function App() {
  const [status, setStatus] = useState<ApiStatus>('memeriksa');

  useEffect(() => {
    fetchHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('gagal'));
  }, []);

  return (
    <main>
      <h1>SKEM AI Co-Pilot</h1>
      <p>Status API: {status}</p>
    </main>
  );
}
