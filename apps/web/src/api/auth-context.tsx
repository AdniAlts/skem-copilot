import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Me, MockUser } from '@skem/shared';
import { getMockUsers, mockLogin, logout as logoutApi } from '../api/auth';

interface AuthContextValue {
  user: Me | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
  mockUsers: MockUser[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Query untuk user yang sedang login
  const { data: user, isLoading } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 menit
  });

  // Query untuk daftar akun dummy
  const { data: mockUsers = [] } = useQuery<MockUser[]>({
    queryKey: ['mock-users'],
    queryFn: getMockUsers,
    staleTime: 1000 * 60 * 10, // 10 menit
  });

  // Mutation untuk login
  const loginMutation = useMutation({
    mutationFn: mockLogin,
    onSuccess: () => {
      // Invalidate semua query dan refetch user
      queryClient.invalidateQueries();
      queryClient.setQueryData(['me'], user);
    },
  });

  // Mutation untuk logout
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Invalidate semua query dan clear user
      queryClient.clear();
      queryClient.setQueryData(['me'], null);
    },
  });

  const login = useCallback(
    async (userId: number) => {
      await loginMutation.mutateAsync(userId);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const value: AuthContextValue = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    mockUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
