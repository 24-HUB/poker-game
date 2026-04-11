import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export function useMe() {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { user } = await authApi.me();
      setUser(user);
      return user;
    },
    retry: false,
  });
}

export function useLogin() {
  const { setUser } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logout();
      qc.clear();
    },
  });
}
