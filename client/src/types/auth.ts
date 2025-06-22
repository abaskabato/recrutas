// Type definitions for Better Auth integration with existing components

export interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Custom fields from our schema
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  profileComplete?: boolean | null;
}

export interface BetterAuthSession {
  data: {
    user: BetterAuthUser;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
  } | null;
  isPending: boolean;
  error: Error | null;
}

// Compatibility types for existing components
export interface CompatibleUser extends BetterAuthUser {
  // Ensure all expected properties are available
  firstName: string;
  lastName: string;
  role: string;
}