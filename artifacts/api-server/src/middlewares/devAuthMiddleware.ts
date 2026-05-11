import { type Request, type Response, type NextFunction } from "express";

/**
 * Development-only authentication middleware that mocks Clerk authentication.
 * This allows local development without valid Clerk credentials.
 * 
 * DO NOT use in production.
 * 
 * Sets fake but consistent auth data on the request object so the app
 * thinks the user is authenticated.
 */
export function devAuthMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Mock authentication: attach a fake user to the request
    (req as any).devAuth = {
      userId: "dev-user-123",
      sessionId: "dev-session-123",
      sessionClaims: {
        email: "dev@example.com",
        firstName: "Dev",
        lastName: "User",
        imageUrl: null,
      },
    };

    next();
  };
}

export function getAuthDev(req: Request) {
  const devAuth = (req as any).devAuth;
  if (devAuth) {
    return { userId: devAuth.userId, sessionClaims: devAuth.sessionClaims };
  }
  return { userId: null, sessionClaims: null };
}
