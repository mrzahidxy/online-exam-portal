import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  schoolCode: string | null;
}

export type SanitizedUser = AuthenticatedUser & {
  createdAt?: Date;
  updatedAt?: Date;
};
