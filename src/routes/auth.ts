// FILE PATH: src/routes/auth.ts
import { Router } from 'express';
import type { Platform } from '@prisma/client';
import { authCookieOptions } from '../utils/jwt.js';
import { authLimiter, twoFaLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { requireAuth, requirePendingTwoFA } from '../middleware/auth.js';
import { validate, loginSchema, registerSchema, twoFaSchema } from '../middleware/validate.js';
import { loginUser, registerUser, verifyTwoFA, getUserWorkspaces } from '../services/workspaceService.js';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../utils/passwords.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, companyName, platforms } = req.validated!.body as {
      name: string;
      email: string;
      password: string;
      companyName: string;
      platforms: Platform[];
    };
    const result = await registerUser({ name, email, password, companyName, platforms });
    res.json(result);
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated!.body as { email: string; password: string };
    const result = await loginUser(email, password);
    res.json(result);
  }),
);

router.post(
  '/verify-2fa',
  twoFaLimiter,
  requirePendingTwoFA,
  validate(twoFaSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.validated!.body as { code: string };
    const { accessToken, refreshToken } = await verifyTwoFA(req.auth!.sub, code);

    res.cookie('refreshToken', refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));
    res.json({ accessToken, twoFAVerified: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

router.get(
  '/workspaces',
  requireAuth,
  asyncHandler(async (req, res) => {
    const workspaces = await getUserWorkspaces(req.user!.id);
    res.json({ workspaces });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});

// Public invite preview — returns workspace name + role so the
// invite acceptance page can show context before login/signup
router.get(
  '/invite-preview/:token',
  asyncHandler(async (req, res) => {
    const rawToken = String(req.params['token'] ?? '');
    if (!rawToken) throw new AppError('Token required', 400, 'BAD_REQUEST');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invites: any[] = await (prisma as any).workspaceInvite.findMany({
      where: { redeemedAt: null, expiresAt: { gt: new Date() } },
      include: { workspace: { select: { company: true, color: true, initials: true } } },
    });

    let matched: any = null;
    for (const inv of invites) {
      const ok = await verifyPassword(rawToken, inv.tokenHash as string);
      if (ok) { matched = inv; break; }
    }

    if (!matched) throw new AppError('Invite link is invalid or has expired', 400, 'INVITE_INVALID');

    res.json({
      workspaceId: matched.workspaceId as string,
      company: matched.workspace.company as string,
      color: matched.workspace.color as string,
      initials: matched.workspace.initials as string,
      role: matched.role as string,
    });
  }),
);

export default router;