import type { JwtPayload } from 'jsonwebtoken';
import type { z } from 'zod';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  twoFAVerified: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  title: string | null;
}

export interface WorkspaceContext {
  id: string;
  company: string;
  initials: string;
  color: string;
  timezone: string;
  membersCount: number;
  role: string;
  permissions: string[];
}

export interface PostMetricsDto {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: AuthTokenPayload;
      workspace?: WorkspaceContext;
      validated?: z.infer<z.ZodType>;
    }
  }
}

export {};
