import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthTokenPayload } from '../types/express.js';

export function signAccessToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires as jwt.SignOptions['expiresIn'],
    issuer: 'backendmosaic',
    audience: 'mosaic-client',
  });
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
    issuer: 'backendmosaic',
    audience: 'mosaic-client',
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret, {
    issuer: 'backendmosaic',
    audience: 'mosaic-client',
  }) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string): JwtPayloadWithSub {
  return jwt.verify(token, env.jwt.refreshSecret, {
    issuer: 'backendmosaic',
    audience: 'mosaic-client',
  }) as JwtPayloadWithSub;
}

interface JwtPayloadWithSub {
  sub: string;
}

export function authCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? ('strict' as const) : ('lax' as const),
    maxAge: maxAgeMs,
    path: '/api/auth',
  };
}
