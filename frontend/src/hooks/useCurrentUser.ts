import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../services/api';
import { User } from '../types/auth';

/**
 * Hook for fetching and caching the current user data
 * 
 * Uses React Query to ensure a single HTTP request regardless of how many
 * components use this hook. Query result is cached and shared across the app.
 * 
 * @example
 * ```tsx
 * const { data: user, isLoading, error } = useCurrentUser();
 * 
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error loading user</div>;
 * 
 * return <div>Welcome, {user?.name}!</div>;
 * ```
 */
export function useCurrentUser(): UseQueryResult<User, Error> {
  return useQuery({
    queryKey: ['currentUser'], // Unique cache key
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.user || response.data.data?.user;
    },
    // Cache the result for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep previous data while refetching (no loading flicker)
    placeholderData: (previousData) => previousData,
    // Don't retry on failure - just show error to user
    retry: 1,
  });
}
