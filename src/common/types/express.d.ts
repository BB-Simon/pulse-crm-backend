import { ApiKeyContext } from '../interfaces/api-key-context.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      apiKeyContext?: ApiKeyContext;
    }
  }
}

export {};
