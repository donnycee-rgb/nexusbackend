import { Router } from 'express';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth.js';
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
} from '../services/workspaceService.js';
import { PLATFORM_META, ALL_PERMISSIONS, MOCK_SONGS } from '../constants/metadata.js';
import { param } from '../utils/param.js';

const router = Router();

router.use(requireAuth);

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
  asyncHandler(async (req, res) => {
    const post = await createPost(param(req.params['workspaceId']), req.validated!.body);
    res.status(201).json({ post });
  }),
);

router.delete(
  '/:workspaceId/posts/:postId',
  validate(postParamSchema),
  requireWorkspaceAccess,
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
  asyncHandler(async (req, res) => {
    const threads = await getWorkspaceMessages(param(req.params['workspaceId']));
    res.json({ threads });
  }),
);

router.get(
  '/:workspaceId/analytics',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
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
  asyncHandler(async (req, res) => {
    const slot = await createSchedulerSlot(param(req.params['workspaceId']), req.validated!.body);
    res.status(201).json({ slot });
  }),
);

router.delete(
  '/:workspaceId/scheduler/:slotId',
  validate(schedulerParamSchema),
  requireWorkspaceAccess,
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
  asyncHandler(async (req, res) => {
    await disconnectPlatform(param(req.params['workspaceId']), param(req.params['platformId']));
    res.json({ success: true });
  }),
);

router.get(
  '/:workspaceId/team',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const team = await getWorkspaceTeam(param(req.params['workspaceId']));
    res.json({ team });
  }),
);

router.post(
  '/:workspaceId/reset',
  validate(workspaceParamSchema),
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    await resetWorkspaceData(param(req.params['workspaceId']));
    res.json({ success: true });
  }),
);

export default router;
