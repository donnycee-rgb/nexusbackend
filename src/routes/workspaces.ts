// FILE PATH: src/routes/workspaces.ts
import { Router } from 'express';
import type { Platform } from '@prisma/client';
import { requireAuth, requireWorkspaceAccess, requirePermission, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  validate,
  workspaceParamSchema,
  postParamSchema,
  createPostSchema,
  createSchedulerSchema,
  updatePlatformSchema,
  schedulerParamSchema,
  notificationParamSchema,
  platformParamSchema,
  createWorkspaceSchema,
  createInviteSchema,
  inviteParamSchema,
  redeemInviteSchema,
} from '../middleware/validate.js';
import {
  getWorkspacePosts,
  createPost,
  deletePost,
  hidePost,
  getWorkspaceNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getWorkspaceMessages,
  getWorkspaceAnalytics,
  getWorkspaceScheduler,
  createSchedulerSlot,
  cancelSchedulerSlot,
  getWorkspacePlatforms,
  updatePlatformConnection,
  disconnectPlatform,
  getWorkspaceTeam,
  resetWorkspaceData,
  createWorkspace,
  createInvite,
  getInvites,
  revokeInvite,
  redeemInvite,
} from '../services/workspaceService.js';
import { PLATFORM_META, ALL_PERMISSIONS, MOCK_SONGS } from '../constants/metadata.js';
import { param } from '../utils/param.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  validate(createWorkspaceSchema),
  asyncHandler(async (req, res) => {
    const { companyName, platforms } = req.validated!.body as {
      companyName: string;
      platforms: Platform[];
    };
    const workspace = await createWorkspace(req.user!.id, companyName, platforms);
    res.status(201).json({ workspace });
  }),
);

router.get('/meta/platform-meta', (_req, res) => {
  res.json({ platformMeta: PLATFORM_META });
});

router.get('/meta/permissions', (_req, res) => {
  res.json({ permissions: ALL_PERMISSIONS });
});

router.get('/meta/songs', (_req, res) => {
  res.json({ songs: MOCK_SONGS });
});

router.get(
  '/:workspaceId/posts',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const includeHidden = req.query['includeHidden'] === 'true';
    const wsId = param(req.params['workspaceId']);
    const posts = await getWorkspacePosts(wsId, includeHidden);
    res.json({ posts });
  }),
);

router.post(
  '/:workspaceId/posts',
  validate(createPostSchema),
  requireWorkspaceAccess,
  requirePermission('compose_posts'),
  asyncHandler(async (req, res) => {
    const post = await createPost(param(req.params['workspaceId']), req.validated!.body);
    res.status(201).json({ post });
  }),
);

router.delete(
  '/:workspaceId/posts/:postId',
  validate(postParamSchema),
  requireWorkspaceAccess,
  requirePermission('delete_posts'),
  asyncHandler(async (req, res) => {
    await deletePost(param(req.params['workspaceId']), param(req.params['postId']));
    res.json({ success: true });
  }),
);

router.patch(
  '/:workspaceId/posts/:postId/hide',
  validate(postParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    await hidePost(param(req.params['workspaceId']), param(req.params['postId']));
    res.json({ success: true });
  }),
);

router.get(
  '/:workspaceId/notifications',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const notifications = await getWorkspaceNotifications(param(req.params['workspaceId']));
    res.json({ notifications });
  }),
);

router.patch(
  '/:workspaceId/notifications/read-all',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    await markAllNotificationsRead(param(req.params['workspaceId']));
    res.json({ success: true });
  }),
);

router.patch(
  '/:workspaceId/notifications/:notificationId/read',
  validate(notificationParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    await markNotificationRead(param(req.params['workspaceId']), param(req.params['notificationId']));
    res.json({ success: true });
  }),
);

router.get(
  '/:workspaceId/messages',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  requirePermission('reply_messages'),
  asyncHandler(async (req, res) => {
    const threads = await getWorkspaceMessages(param(req.params['workspaceId']));
    res.json({ threads });
  }),
);

router.get(
  '/:workspaceId/analytics',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  requirePermission('view_analytics'),
  asyncHandler(async (req, res) => {
    const analytics = await getWorkspaceAnalytics(param(req.params['workspaceId']));
    res.json({ analytics });
  }),
);

router.get(
  '/:workspaceId/scheduler',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const scheduler = await getWorkspaceScheduler(param(req.params['workspaceId']));
    res.json({ scheduler });
  }),
);

router.post(
  '/:workspaceId/scheduler',
  validate(createSchedulerSchema),
  requireWorkspaceAccess,
  requirePermission('schedule_posts'),
  asyncHandler(async (req, res) => {
    const slot = await createSchedulerSlot(param(req.params['workspaceId']), req.validated!.body);
    res.status(201).json({ slot });
  }),
);

router.delete(
  '/:workspaceId/scheduler/:slotId',
  validate(schedulerParamSchema),
  requireWorkspaceAccess,
  requirePermission('schedule_posts'),
  asyncHandler(async (req, res) => {
    await cancelSchedulerSlot(param(req.params['workspaceId']), param(req.params['slotId']));
    res.json({ success: true });
  }),
);

router.get(
  '/:workspaceId/platforms',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const platforms = await getWorkspacePlatforms(param(req.params['workspaceId']));
    res.json({ platforms });
  }),
);

router.patch(
  '/:workspaceId/platforms/:platformId',
  validate(updatePlatformSchema),
  requireWorkspaceAccess,
  requirePermission('manage_profiles'),
  asyncHandler(async (req, res) => {
    const platform = await updatePlatformConnection(
      param(req.params['workspaceId']),
      param(req.params['platformId']),
      req.validated!.body,
    );
    res.json({ platform });
  }),
);

router.post(
  '/:workspaceId/platforms/:platformId/disconnect',
  validate(platformParamSchema),
  requireWorkspaceAccess,
  requirePermission('manage_profiles'),
  asyncHandler(async (req, res) => {
    await disconnectPlatform(param(req.params['workspaceId']), param(req.params['platformId']));
    res.json({ success: true });
  }),
);

router.get(
  '/:workspaceId/team',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  requirePermission('access_admin'),
  asyncHandler(async (req, res) => {
    const team = await getWorkspaceTeam(param(req.params['workspaceId']));
    res.json({ team });
  }),
);

// ── Invites ──────────────────────────────────────────────────────────────────

router.get(
  '/:workspaceId/invites',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  requirePermission('access_admin'),
  asyncHandler(async (req, res) => {
    const invites = await getInvites(param(req.params['workspaceId']));
    res.json({ invites });
  }),
);

router.post(
  '/:workspaceId/invites',
  validate(createInviteSchema),
  requireWorkspaceAccess,
  requirePermission('access_admin'),
  asyncHandler(async (req, res) => {
    const { role, permissions } = req.validated!.body as {
      role: 'admin' | 'member';
      permissions: string[];
    };
    const result = await createInvite(
      param(req.params['workspaceId']),
      req.user!.id,
      { role, permissions },
    );
    res.status(201).json(result);
  }),
);

router.delete(
  '/:workspaceId/invites/:inviteId',
  validate(inviteParamSchema),
  requireWorkspaceAccess,
  requirePermission('access_admin'),
  asyncHandler(async (req, res) => {
    await revokeInvite(
      param(req.params['workspaceId']),
      param(req.params['inviteId']),
    );
    res.json({ success: true });
  }),
);

// Redeem route — authenticated but no workspace context yet (user is joining)
router.post(
  '/invites/redeem',
  validate(redeemInviteSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.validated!.body as { token: string };
    const result = await redeemInvite(token, req.user!.id);
    // Return updated workspace list so frontend can refresh immediately
    const { getUserWorkspaces } = await import('../services/workspaceService.js');
    const workspaces = await getUserWorkspaces(req.user!.id);
    res.json({ workspaceId: result.workspaceId, workspaces });
  }),
);

router.post(
  '/:workspaceId/reset',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await resetWorkspaceData(param(req.params['workspaceId']));
    res.json({ success: true });
  }),
);

export default router;