import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { param } from '../utils/param.js';
import { AppError } from './errorHandler.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload.twoFAVerified) {
      next(new AppError('Two-factor verification required', 403, 'TWO_FA_REQUIRED'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, avatar: true, title: true },
    });

    if (!user) {
      next(new AppError('User not found', 401, 'UNAUTHORIZED'));
      return;
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}

export function requirePendingTwoFA(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.twoFAVerified) {
      next(new AppError('Two-factor already verified', 400, 'TWO_FA_ALREADY_VERIFIED'));
      return;
    }

    req.auth = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}

export async function requireWorkspaceAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const workspaceId = param(req.params['workspaceId']);
  if (!workspaceId || !req.user) {
    next(new AppError('Workspace ID required', 400, 'BAD_REQUEST'));
    return;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: req.user.id },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!membership) {
    next(new AppError('Workspace access denied', 403, 'FORBIDDEN'));
    return;
  }

  req.workspace = {
    id: membership.workspace.id,
    company: membership.workspace.company,
    initials: membership.workspace.initials,
    color: membership.workspace.color,
    timezone: membership.workspace.timezone,
    membersCount: membership.workspace._count.members,
    role: membership.role,
    permissions: membership.permissions,
  };

  next();
}
