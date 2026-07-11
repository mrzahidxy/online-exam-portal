import type { AuthenticatedUser } from '../user';
import type { OrganizerContext } from '../http';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizer?: OrganizerContext;
      id?: string;
    }
  }
}

export {};
