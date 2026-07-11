import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export type PlatformRole = 'ADMIN' | 'USER';
export type MembershipRole = 'OWNER' | 'STUDENT';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED';
export type OrganizerStatus = 'ACTIVE' | 'SUSPENDED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  schoolCode?: string | null;
  activeOrganizer?: {
    id: string;
    name: string;
    slug: string;
    status: OrganizerStatus;
    subscriptionStatus: SubscriptionStatus;
  };
  membership?: {
    role: MembershipRole;
    status: MembershipStatus;
  };
  // Backward-compatible fields returned by the current backend during migration.
  role?: string;
  activeOrganizerId?: string;
  organizerId?: string;
  membershipRole?: MembershipRole;
  organizerRole?: MembershipRole;
  membershipStatus?: MembershipStatus;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterCredentials =
  | {
      registrationType: 'ORGANIZER';
      name: string;
      email: string;
      password: string;
      organizerName: string;
      organizerSlug?: string;
    }
  | {
      registrationType: 'STUDENT';
      name: string;
      email: string;
      password: string;
      organizerSlug: string;
    };

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeUser = (user: User): User => {
  const membershipRole = user.membership?.role ?? user.membershipRole ?? user.organizerRole ?? (user.role?.toUpperCase() === 'ADMIN' ? 'OWNER' : user.role?.toUpperCase() === 'STUDENT' ? 'STUDENT' : undefined);
  const membershipStatus = user.membership?.status ?? user.membershipStatus;

  return {
    ...user,
    platformRole: user.platformRole ?? 'USER',
    membership: membershipRole
      ? {
          role: membershipRole,
          status: membershipStatus ?? 'ACTIVE',
        }
      : user.membership,
  };
};

export const authService = {
  register: async (credentials: RegisterCredentials): Promise<User> => {
    const response = await api.post('/auth/register', credentials);
    return normalizeUser(response.data.user);
  },

  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await api.post('/auth/login', credentials);
    return normalizeUser(response.data.user);
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return normalizeUser(response.data);
  },
};
