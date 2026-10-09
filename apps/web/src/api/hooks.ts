import { useQuery } from '@tanstack/react-query';
import type { Me } from '@skem/shared';
import { apiClient } from './client';

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => apiClient.get<Me>('/api/me'),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });
}
