import { MembershipStatus, OrganizerRole, OrganizerStatus, PlatformRole, SubscriptionStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  schoolCode: string | null;
  organizerId?: string;
  activeOrganizerId?: string;
  membershipId?: string;
  membershipRole?: OrganizerRole;
  organizerRole?: OrganizerRole;
  membershipStatus?: MembershipStatus;
  activeOrganizer?: {
    id: string;
    name: string;
    slug: string;
    status: OrganizerStatus;
    subscriptionStatus: SubscriptionStatus;
  };
  membership?: {
    role: OrganizerRole;
    status: MembershipStatus;
  };
}

export type SanitizedUser = AuthenticatedUser & {
  createdAt?: Date;
  updatedAt?: Date;
};
