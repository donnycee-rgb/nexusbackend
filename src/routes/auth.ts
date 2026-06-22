import { Router } from 'express';
import { authCookieOptions } from '../utils/jwt.js';
import { authLimiter, twoFaLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requirePendingTwoFA } from '../middleware/auth.js';
import { validate, loginSchema, registerSchema, twoFaSchema } from '../middleware/validate.js';
import { loginUser, registerUser, verifyTwoFA, getUserWorkspaces } from '../services/workspaceService.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, companyName } = req.validated!.body as {
      name: string;
      email: string;
      password: string;
      companyName: string;
    };
    const result = await registerUser({ name, email, password, companyName });
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

export default router;