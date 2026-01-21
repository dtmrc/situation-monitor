import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { api, authApi } from '@/lib/api';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    enabled: !!api.getAccessToken(),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      api.setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      void navigate({ to: '/projects' });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      api.setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      void navigate({ to: '/projects' });
    },
  });

  const logout = () => {
    api.setAccessToken(null);
    localStorage.removeItem('refreshToken');
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  return {
    user: userData?.user,
    isLoading,
    isAuthenticated: !!userData?.user,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
  };
}
