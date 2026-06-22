import { randomUUID } from 'node:crypto';
import type {
  Message,
  MessageThread,
  Platform,
  PlatformConnection,
  Post,
  PostMetric,
  PostStatus,
  PostType,
  SchedulerSlot,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hashPassword, hashToken, verifyPassword } from '../utils/passwords.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpCode } from '../utils/totp.js';
import { encryptSecret } from '../utils/crypto.js';
import { ALL_PERMISSIONS } from '../constants/metadata.js';
import { AppError } from '../middleware/errorHandler.js';
import type { PostMetricsDto } from '../types/express.js';

type PostWithMetrics = Post & { metrics: PostMetric[] };
type ThreadWithMessages = MessageThread & { messages: Message[] };

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function aggregateMetrics(rows: PostMetric[]): PostMetricsDto {
  if (rows.length === 0) {
    return {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
    };
  }

  const totals = rows.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      reach: acc.reach + m.reach,
      likes: acc.likes + m.likes,
      comments: acc.comments + m.comments,
      shares: acc.shares + m.shares,
      saves: acc.saves + m.saves,
      engagementRate: acc.engagementRate + m.engagementRate,
    }),
    {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
    },
  );

  return {
    ...totals,
    engagementRate: totals.engagementRate / rows.length,
  };
}

function mapPost(row: PostWithMetrics) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    caption: row.caption,
    platforms: row.platforms,
    status: row.status,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    publishedAt: toIso(row.publishedAt),
    scheduledFor: toIso(row.scheduledFor),
    metrics: aggregateMetrics(row.metrics),
  };
}

function mapNotification(row: {
  id: string;
  workspaceId: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
}) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.read,
  };
}

function mapThread(row: ThreadWithMessages) {
  const unreadCount = row.messages.filter(
    (m) => m.sender === 'client' && m.readAt === null,
  ).length;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    platform: row.platform,
    participant: {
      id: row.participantId,
      name: row.participantName,
      handle: row.participantHandle,
      initials: row.participantInitials,
    },
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount,
    pinned: row.pinned,
    messages: row.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      senderName: m.senderName,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
    })),
  };
}

function mapScheduler(row: SchedulerSlot) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    platforms: row.platforms,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status,
    postId: row.postId,
  };
}

function mapPlatform(row: PlatformConnection) {
  return {
    id: row.id,
    platform: row.platform,
    status: row.status,
    account: row.account,
    followers: row.followers,
    bio: row.bio,
    website: row.website,
  };
}

function parsePlatforms(platforms: string[]): Platform[] {
  return platforms as Platform[];
}

function parsePostType(type: string): PostType {
  return type === 'video' ? 'video' : 'image';
}

function parsePostStatus(status: string): PostStatus {
  if (status === 'published' || status === 'scheduled') return status;
  return 'draft';
}

function deriveInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

const WORKSPACE_COLORS = [
  '#E8621A', '#3B9EE8', '#2ECC8A', '#A855F7', '#F43F5E', '#F59E0B', '#06B6D4',
] as const;

function pickWorkspaceColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return WORKSPACE_COLORS[hash % WORKSPACE_COLORS.length]!;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const totpSecret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(email, totpSecret);
  const encryptedSecret = encryptSecret(totpSecret);
  const companyName = input.companyName.trim();

  const { user } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        twoFaSecret: encryptedSecret,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        company: companyName,
        initials: deriveInitials(companyName),
        color: pickWorkspaceColor(companyName),
        timezone: 'UTC',
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'admin',
        permissions: [...ALL_PERMISSIONS],
      },
    });

    return { user, workspace };
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    twoFAVerified: false,
  });

  return {
    accessToken,
    requiresTwoFA: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
    },
    twoFASetup: {
      secret: totpSecret,
      otpauthUrl,
    },
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      avatar: true,
      title: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    twoFAVerified: false,
  });

  return {
    accessToken,
    requiresTwoFA: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
    },
  };
}

export async function verifyTwoFA(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFaSecret: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const valid = verifyTotpCode(user.twoFaSecret, code);
  if (!valid) {
    throw new AppError('Incorrect verification code', 401, 'INVALID_2FA');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    twoFAVerified: true,
  });

  const refreshToken = signRefreshToken({ sub: user.id });
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true } },
          platformConnections: {
            where: { status: 'connected' },
            select: { platform: true },
            distinct: ['platform'],
          },
        },
      },
    },
    orderBy: { workspace: { company: 'asc' } },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    company: m.workspace.company,
    initials: m.workspace.initials,
    color: m.workspace.color,
    timezone: m.workspace.timezone,
    membersCount: m.workspace._count.members,
    role: m.role,
    platforms: m.workspace.platformConnections.map((p) => p.platform),
  }));
}

export async function getWorkspacePosts(workspaceId: string, includeHidden = false) {
  const hidden = includeHidden
    ? new Set<string>()
    : new Set(
        (
          await prisma.hiddenPost.findMany({
            where: { workspaceId },
            select: { postId: true },
          })
        ).map((h) => h.postId),
      );

  const rows = await prisma.post.findMany({
    where: { workspaceId },
    include: { metrics: true },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapPost).filter((p) => !hidden.has(p.id));
}

export async function createPost(
  workspaceId: string,
  payload: {
    title: string;
    caption: string;
    platforms: string[];
    status: string;
    type: string;
    scheduledFor?: string | null;
  },
) {
  const now = new Date();
  const platforms = parsePlatforms(payload.platforms);
  const status = parsePostStatus(payload.status);
  const type = parsePostType(payload.type);

  const post = await prisma.post.create({
    data: {
      id: `post-${randomUUID().slice(0, 8)}`,
      workspaceId,
      title: payload.title,
      caption: payload.caption,
      platforms,
      status,
      type,
      mediaUrls: [],
      publishedAt: status === 'published' ? now : null,
      scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
      metrics: {
        create: platforms.map((platform) => ({
          platform,
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          engagementRate: 0,
        })),
      },
    },
    include: { metrics: true },
  });

  return mapPost(post);
}

export async function deletePost(workspaceId: string, postId: string) {
  const result = await prisma.post.deleteMany({
    where: { id: postId, workspaceId },
  });

  if (result.count === 0) {
    throw new AppError('Post not found', 404, 'NOT_FOUND');
  }
}

export async function hidePost(workspaceId: string, postId: string) {
  const exists = await prisma.post.findFirst({
    where: { id: postId, workspaceId },
    select: { id: true },
  });

  if (!exists) {
    throw new AppError('Post not found', 404, 'NOT_FOUND');
  }

  await prisma.hiddenPost.upsert({
    where: { workspaceId_postId: { workspaceId, postId } },
    create: { workspaceId, postId },
    update: {},
  });
}

export async function getWorkspaceNotifications(workspaceId: string) {
  const rows = await prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapNotification);
}

export async function markNotificationRead(workspaceId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, workspaceId },
    data: { read: true },
  });

  if (result.count === 0) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }
}

export async function markAllNotificationsRead(workspaceId: string) {
  await prisma.notification.updateMany({
    where: { workspaceId },
    data: { read: true },
  });
}

export async function getWorkspaceMessages(workspaceId: string) {
  const rows = await prisma.messageThread.findMany({
    where: { workspaceId },
    include: { messages: { orderBy: { sentAt: 'asc' } } },
    orderBy: { lastMessageAt: 'desc' },
  });
  return rows.map(mapThread);
}

export async function getWorkspaceAnalytics(workspaceId: string) {
  const row = await prisma.analytics.findUnique({ where: { workspaceId } });
  if (!row) return null;

  return {
    range: row.range,
    summary: row.summary,
    engagementTrend: row.engagementTrend,
    reachTrend: row.reachTrend,
    platformBreakdown: row.platformBreakdown,
  };
}

export async function getWorkspaceScheduler(workspaceId: string) {
  const rows = await prisma.schedulerSlot.findMany({
    where: { workspaceId },
    orderBy: { scheduledFor: 'asc' },
  });
  return rows.map(mapScheduler);
}

export async function createSchedulerSlot(
  workspaceId: string,
  payload: {
    title: string;
    platforms: string[];
    scheduledFor: string;
    status: string;
    postId?: string | null;
  },
) {
  const slot = await prisma.schedulerSlot.create({
    data: {
      id: `sch-${randomUUID().slice(0, 8)}`,
      workspaceId,
      title: payload.title,
      platforms: parsePlatforms(payload.platforms),
      scheduledFor: new Date(payload.scheduledFor),
      status: payload.status === 'draft' ? 'draft' : 'scheduled',
      postId: payload.postId ?? null,
    },
  });

  return mapScheduler(slot);
}

export async function cancelSchedulerSlot(workspaceId: string, slotId: string) {
  const result = await prisma.schedulerSlot.deleteMany({
    where: { id: slotId, workspaceId },
  });

  if (result.count === 0) {
    throw new AppError('Scheduler slot not found', 404, 'NOT_FOUND');
  }
}

export async function getWorkspacePlatforms(workspaceId: string) {
  const rows = await prisma.platformConnection.findMany({
    where: { workspaceId },
    orderBy: { platform: 'asc' },
  });
  return rows.map(mapPlatform);
}

export async function updatePlatformConnection(
  workspaceId: string,
  platformId: string,
  updates: { bio?: string; website?: string; account?: string },
) {
  const existing = await prisma.platformConnection.findFirst({
    where: { id: platformId, workspaceId },
  });

  if (!existing) {
    throw new AppError('Platform connection not found', 404, 'NOT_FOUND');
  }

  const row = await prisma.platformConnection.update({
    where: { id: platformId },
    data: {
      bio: updates.bio ?? existing.bio,
      website: updates.website ?? existing.website,
      account: updates.account ?? existing.account,
    },
  });

  return mapPlatform(row);
}

export async function disconnectPlatform(workspaceId: string, platformId: string) {
  const result = await prisma.platformConnection.updateMany({
    where: { id: platformId, workspaceId },
    data: { status: 'disconnected' },
  });

  if (result.count === 0) {
    throw new AppError('Platform connection not found', 404, 'NOT_FOUND');
  }
}

export async function getWorkspaceTeam(workspaceId: string) {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return rows.map((r) => ({
    id: r.user.id,
    name: r.user.name,
    email: r.user.email,
    role: r.role,
    joined: r.joinedAt.toISOString().slice(0, 10),
    permissions: r.permissions,
  }));
}

export async function resetWorkspaceData(workspaceId: string) {
  await prisma.$transaction([
    prisma.hiddenPost.deleteMany({ where: { workspaceId } }),
    prisma.post.deleteMany({ where: { workspaceId } }),
    prisma.notification.deleteMany({ where: { workspaceId } }),
    prisma.schedulerSlot.deleteMany({ where: { workspaceId } }),
  ]);
}