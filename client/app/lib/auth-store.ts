import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, RegisterCredentials, User } from './auth-service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  register: (credentials: RegisterCredentials) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      register: async (credentials) => {
        set({ isLoading: true });
        try {
          const user = await authService.register(credentials);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const user = await authService.login({ email, password });
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const getMembershipRole = (user = useAuthStore.getState().user) => user?.membership?.role;

export const isOwner = () => getMembershipRole() === 'OWNER';
export const isStudent = () => getMembershipRole() === 'STUDENT';
export const isAdmin = isOwner;

export const isAccessBlocked = (user: User | null) => {
  if (!user) return false;
  return (
    user.membership?.status === 'SUSPENDED' ||
    user.activeOrganizer?.status === 'SUSPENDED' ||
    user.activeOrganizer?.subscriptionStatus === 'EXPIRED' ||
    user.activeOrganizer?.subscriptionStatus === 'CANCELLED'
  );
};
