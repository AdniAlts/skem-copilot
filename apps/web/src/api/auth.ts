import { apiClient } from './client';
import type { Me, MockUser } from '@skem/shared';

/**
 * Ambil daftar akun dummy untuk pemilih peran (Simulasi).
 */
export async function getMockUsers(): Promise<MockUser[]> {
  return apiClient.get<MockUser[]>('/api/auth/mock-users');
}

/**
 * Login sebagai akun dummy tertentu.
 */
export async function mockLogin(userId: number): Promise<Me> {
  return apiClient.post<Me>('/api/auth/mock-login', { userId });
}

/**
 * Logout dari sesi saat ini.
 */
export async function logout(): Promise<void> {
  return apiClient.post<void>('/api/auth/logout');
}
