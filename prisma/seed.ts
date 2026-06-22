import {
  Platform,
  PlatformConnectionStatus,
  PostStatus,
  PostType,
  PrismaClient,
  WorkspaceRole,
  NotificationType,
  NotificationSeverity,
  MessageSender,
  SchedulerStatus,
} from '@prisma/client';
import { hashPassword } from '../src/utils/passwords.js';
import { encryptSecret } from '../src/utils/crypto.js';
import { generateTotpSecret, buildOtpAuthUrl } from '../src/utils/totp.js';

const prisma = new PrismaClient();

/** Demo password — only defined in this seed file. */
const DEMO_PASSWORD = 'N3xus@2026';

const ALL_PERMISSIONS = [
  'compose_posts',
  'publish_posts',
  'delete_posts',
  'view_analytics',
  'reply_messages',
  'schedule_posts',
  'manage_profiles',
  'use_kill_switch',
  'access_admin',
];

async function createUser(
  id: string,
  name: string,
  email: string,
  title: string | null,
): Promise<{ otpauthUrl: string; secret: string }> {
  const secret = generateTotpSecret();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const twoFaSecret = encryptSecret(secret);

  await prisma.user.create({
    data: {
      id,
      name,
      email,
      passwordHash,
      avatar: null,
      title,
      twoFaSecret,
    },
  });

  return {
    secret,
    otpauthUrl: buildOtpAuthUrl(email, secret),
  };
}

function d(iso: string): Date {
  return new Date(iso);
}

async function main() {
  console.log('Seeding database...');

  const totpInfo: Array<{ email: string; otpauthUrl: string; secret: string }> = [];

  const users = [
    { id: 'user-001', name: 'Rita Nwosu', email: 'rita@nexus.app', title: 'Head of Growth' },
    { id: 'u2', name: 'Jordan Lee', email: 'jordan@auroralabs.io', title: 'Team Member' },
    { id: 'u3', name: 'Sam Rivera', email: 'sam@auroralabs.io', title: 'Team Member' },
    { id: 'u4', name: 'Mia Chen', email: 'mia@vantamotion.co', title: 'Team Admin' },
    { id: 'u5', name: 'Tom Brooks', email: 'tom@rivetretail.com', title: 'Team Admin' },
    { id: 'u6', name: 'Aisha Patel', email: 'aisha@rivetretail.com', title: 'Team Member' },
  ] as const;

  for (const u of users) {
    const totp = await createUser(u.id, u.name, u.email, u.title);
    totpInfo.push({ email: u.email, ...totp });
  }

  await prisma.workspace.createMany({
    data: [
      { id: 'ws-aurora', company: 'Aurora Labs', initials: 'AL', color: '#E8621A', timezone: 'Africa/Nairobi' },
      { id: 'ws-vanta', company: 'Vanta Motion', initials: 'VM', color: '#3B9EE8', timezone: 'Europe/London' },
      { id: 'ws-rivet', company: 'Rivet Retail', initials: 'RR', color: '#2ECC8A', timezone: 'America/New_York' },
    ],
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: 'ws-aurora', userId: 'user-001', role: WorkspaceRole.admin, permissions: ALL_PERMISSIONS, joinedAt: d('2026-01-10') },
      { workspaceId: 'ws-aurora', userId: 'u2', role: WorkspaceRole.member, permissions: ['compose_posts', 'view_analytics', 'reply_messages', 'schedule_posts'], joinedAt: d('2026-02-14') },
      { workspaceId: 'ws-aurora', userId: 'u3', role: WorkspaceRole.member, permissions: ['compose_posts', 'view_analytics'], joinedAt: d('2026-03-01') },
      { workspaceId: 'ws-vanta', userId: 'user-001', role: WorkspaceRole.member, permissions: ALL_PERMISSIONS, joinedAt: d('2026-01-10') },
      { workspaceId: 'ws-vanta', userId: 'u4', role: WorkspaceRole.admin, permissions: ALL_PERMISSIONS, joinedAt: d('2026-01-20') },
      { workspaceId: 'ws-rivet', userId: 'user-001', role: WorkspaceRole.admin, permissions: ALL_PERMISSIONS, joinedAt: d('2026-01-10') },
      { workspaceId: 'ws-rivet', userId: 'u5', role: WorkspaceRole.admin, permissions: ALL_PERMISSIONS, joinedAt: d('2026-01-05') },
      { workspaceId: 'ws-rivet', userId: 'u6', role: WorkspaceRole.member, permissions: ['compose_posts', 'reply_messages'], joinedAt: d('2026-03-15') },
    ],
  });

  const posts: Array<{
    id: string;
    workspaceId: string;
    title: string;
    caption: string;
    platforms: Platform[];
    status: PostStatus;
    type: PostType;
    createdAt: Date;
    publishedAt: Date | null;
    scheduledFor: Date | null;
    metrics: { impressions: number; reach: number; likes: number; comments: number; shares: number; saves: number; engagementRate: number };
  }> = [
    { id: 'post-aur-001', workspaceId: 'ws-aurora', title: 'Spring Launch Reel', caption: 'From idea to impact. Meet the workflow behind our latest launch.', platforms: [Platform.instagram, Platform.x], status: PostStatus.published, type: PostType.video, createdAt: d('2026-04-21T08:00:00Z'), publishedAt: d('2026-04-21T10:10:00Z'), scheduledFor: null, metrics: { impressions: 128400, reach: 93400, likes: 7210, comments: 412, shares: 298, saves: 680, engagementRate: 8.37 } },
    { id: 'post-aur-002', workspaceId: 'ws-aurora', title: 'BTS Carousel', caption: 'A behind-the-scenes look at our product sprint board.', platforms: [Platform.linkedin, Platform.instagram], status: PostStatus.scheduled, type: PostType.image, createdAt: d('2026-04-22T12:16:00Z'), publishedAt: null, scheduledFor: d('2026-04-28T11:30:00Z'), metrics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagementRate: 0 } },
    { id: 'post-aur-003', workspaceId: 'ws-aurora', title: 'Community Spotlight', caption: 'Celebrating creators building with NEXUS every week.', platforms: [Platform.x], status: PostStatus.draft, type: PostType.image, createdAt: d('2026-04-23T09:02:00Z'), publishedAt: null, scheduledFor: null, metrics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagementRate: 0 } },
    { id: 'post-aur-004', workspaceId: 'ws-aurora', title: 'Analytics Snapshot', caption: 'Q2 benchmark highlights for growth teams.', platforms: [Platform.linkedin], status: PostStatus.published, type: PostType.image, createdAt: d('2026-04-18T06:22:00Z'), publishedAt: d('2026-04-19T08:00:00Z'), scheduledFor: null, metrics: { impressions: 74300, reach: 55200, likes: 2780, comments: 220, shares: 164, saves: 340, engagementRate: 6.31 } },
    { id: 'post-van-001', workspaceId: 'ws-vanta', title: 'Motion Clip #13', caption: 'Fast cuts. Strong story. Better conversion.', platforms: [Platform.tiktok, Platform.instagram], status: PostStatus.published, type: PostType.video, createdAt: d('2026-04-20T07:00:00Z'), publishedAt: d('2026-04-20T11:45:00Z'), scheduledFor: null, metrics: { impressions: 218900, reach: 171400, likes: 10320, comments: 982, shares: 645, saves: 1105, engagementRate: 7.48 } },
    { id: 'post-van-002', workspaceId: 'ws-vanta', title: 'Teaser Thread', caption: 'Ready for next week. Sneak peek in 3 tweets.', platforms: [Platform.x], status: PostStatus.scheduled, type: PostType.image, createdAt: d('2026-04-23T11:30:00Z'), publishedAt: null, scheduledFor: d('2026-04-28T13:00:00Z'), metrics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagementRate: 0 } },
    { id: 'post-riv-001', workspaceId: 'ws-rivet', title: 'Weekend Offers Story', caption: "Swipe up for this weekend's top deals.", platforms: [Platform.instagram, Platform.facebook], status: PostStatus.published, type: PostType.image, createdAt: d('2026-04-19T10:14:00Z'), publishedAt: d('2026-04-19T12:00:00Z'), scheduledFor: null, metrics: { impressions: 93600, reach: 73300, likes: 3922, comments: 301, shares: 202, saves: 314, engagementRate: 5.06 } },
    { id: 'post-riv-002', workspaceId: 'ws-rivet', title: 'WhatsApp Broadcast Draft', caption: 'Loyalty club exclusive drop goes live tomorrow morning.', platforms: [Platform.whatsapp], status: PostStatus.draft, type: PostType.image, createdAt: d('2026-04-23T07:24:00Z'), publishedAt: null, scheduledFor: null, metrics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagementRate: 0 } },
  ];

  for (const p of posts) {
    await prisma.post.create({
      data: {
        id: p.id,
        workspaceId: p.workspaceId,
        title: p.title,
        caption: p.caption,
        platforms: p.platforms,
        status: p.status,
        type: p.type,
        mediaUrls: [],
        createdAt: p.createdAt,
        publishedAt: p.publishedAt,
        scheduledFor: p.scheduledFor,
        metrics: {
          create: {
            platform: p.platforms[0]!,
            ...p.metrics,
          },
        },
      },
    });
  }

  const threads = [
    { id: 'thread-aur-001', workspaceId: 'ws-aurora', platform: Platform.instagram, participantId: 'client-223', participantName: 'Jordan M.', participantHandle: '@jordesign', participantInitials: 'JM', lastMessageAt: d('2026-04-27T17:12:00Z'), pinned: true, messages: [
      { id: 'msg-001', sender: MessageSender.client, senderName: 'Jordan M.', body: 'Can I feature this reel in my weekly roundup?', sentAt: d('2026-04-27T16:59:00Z'), readAt: null },
      { id: 'msg-002', sender: MessageSender.client, senderName: 'Jordan M.', body: 'Also need the posting guidelines.', sentAt: d('2026-04-27T17:12:00Z'), readAt: null },
    ]},
    { id: 'thread-aur-002', workspaceId: 'ws-aurora', platform: Platform.x, participantId: 'client-819', participantName: 'Tech Orbit', participantHandle: '@techorbitdaily', participantInitials: 'TO', lastMessageAt: d('2026-04-26T21:03:00Z'), pinned: false, messages: [
      { id: 'msg-003', sender: MessageSender.agent, senderName: 'NEXUS Team', body: 'Thanks for the mention! Media kit attached.', sentAt: d('2026-04-26T21:03:00Z'), readAt: d('2026-04-26T21:03:00Z') },
    ]},
    { id: 'thread-aur-003', workspaceId: 'ws-aurora', platform: Platform.linkedin, participantId: 'client-441', participantName: 'Priya Sharma', participantHandle: 'priya-sharma-vc', participantInitials: 'PS', lastMessageAt: d('2026-04-27T09:30:00Z'), pinned: false, messages: [
      { id: 'msg-004', sender: MessageSender.client, senderName: 'Priya Sharma', body: 'Would love to connect about a potential partnership.', sentAt: d('2026-04-27T09:30:00Z'), readAt: null },
    ]},
    { id: 'thread-van-001', workspaceId: 'ws-vanta', platform: Platform.tiktok, participantId: 'client-341', participantName: 'Mila Creative', participantHandle: '@milacreates', participantInitials: 'MC', lastMessageAt: d('2026-04-27T08:44:00Z'), pinned: false, messages: [
      { id: 'msg-005', sender: MessageSender.client, senderName: 'Mila Creative', body: 'Can we collab on the next trend format?', sentAt: d('2026-04-27T08:44:00Z'), readAt: null },
    ]},
    { id: 'thread-riv-001', workspaceId: 'ws-rivet', platform: Platform.whatsapp, participantId: 'client-506', participantName: 'Ifeoma B.', participantHandle: '+234 812 227 1098', participantInitials: 'IB', lastMessageAt: d('2026-04-27T12:02:00Z'), pinned: false, messages: [
      { id: 'msg-006', sender: MessageSender.client, senderName: 'Ifeoma B.', body: 'Is same-day delivery available in Abuja?', sentAt: d('2026-04-27T12:02:00Z'), readAt: null },
    ]},
  ];

  for (const t of threads) {
    await prisma.messageThread.create({
      data: {
        id: t.id,
        workspaceId: t.workspaceId,
        platform: t.platform,
        participantId: t.participantId,
        participantName: t.participantName,
        participantHandle: t.participantHandle,
        participantInitials: t.participantInitials,
        lastMessageAt: t.lastMessageAt,
        pinned: t.pinned,
        messages: { create: t.messages },
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      { id: 'notif-aur-001', workspaceId: 'ws-aurora', type: NotificationType.message, severity: NotificationSeverity.info, title: 'New inbox message', body: 'Jordan M. replied to your campaign DM.', createdAt: d('2026-04-27T17:13:00Z'), read: false },
      { id: 'notif-aur-002', workspaceId: 'ws-aurora', type: NotificationType.publish, severity: NotificationSeverity.success, title: 'Post published successfully', body: 'Spring Launch Reel is live on Instagram and X.', createdAt: d('2026-04-21T10:11:00Z'), read: true },
      { id: 'notif-aur-003', workspaceId: 'ws-aurora', type: NotificationType.approval, severity: NotificationSeverity.warning, title: 'Approval pending', body: 'BTS Carousel is waiting for review.', createdAt: d('2026-04-22T12:20:00Z'), read: false },
      { id: 'notif-aur-004', workspaceId: 'ws-aurora', type: NotificationType.system, severity: NotificationSeverity.info, title: 'Analytics sync complete', body: 'Latest engagement metrics are now available.', createdAt: d('2026-04-27T06:45:00Z'), read: true },
      { id: 'notif-aur-005', workspaceId: 'ws-aurora', type: NotificationType.follow, severity: NotificationSeverity.success, title: '142 new followers', body: 'Your Instagram gained 142 followers today.', createdAt: d('2026-04-27T08:00:00Z'), read: false },
      { id: 'notif-van-001', workspaceId: 'ws-vanta', type: NotificationType.publish, severity: NotificationSeverity.success, title: 'Motion Clip exceeded baseline', body: 'Performance is 18% above campaign average.', createdAt: d('2026-04-21T09:45:00Z'), read: false },
      { id: 'notif-van-002', workspaceId: 'ws-vanta', type: NotificationType.system, severity: NotificationSeverity.warning, title: 'Token expiring', body: 'Instagram account token expires in 5 days.', createdAt: d('2026-04-27T03:12:00Z'), read: false },
      { id: 'notif-riv-001', workspaceId: 'ws-rivet', type: NotificationType.message, severity: NotificationSeverity.info, title: 'New WhatsApp response', body: 'A customer asked about return policy.', createdAt: d('2026-04-27T12:03:00Z'), read: false },
      { id: 'notif-riv-002', workspaceId: 'ws-rivet', type: NotificationType.publish, severity: NotificationSeverity.danger, title: 'Boost campaign paused', body: 'Ad account reached daily spend cap.', createdAt: d('2026-04-20T22:18:00Z'), read: true },
    ],
  });

  const analyticsData = [
    { workspaceId: 'ws-aurora', range: '30d', summary: { followers: { current: 128400, previous: 117200, change: 9.56 }, impressions: { current: 612000, previous: 553200, change: 10.63 }, engagementRate: { current: 7.82, previous: 6.94, change: 12.68 }, ctr: { current: 3.12, previous: 2.78, change: 12.23 } }, engagementTrend: [{ label: 'Mon', value: 6.8 }, { label: 'Tue', value: 7.1 }, { label: 'Wed', value: 7.9 }, { label: 'Thu', value: 8.4 }, { label: 'Fri', value: 8.1 }, { label: 'Sat', value: 7.4 }, { label: 'Sun', value: 7.0 }], reachTrend: [{ label: 'Mon', value: 62400 }, { label: 'Tue', value: 71500 }, { label: 'Wed', value: 81200 }, { label: 'Thu', value: 87600 }, { label: 'Fri', value: 85200 }, { label: 'Sat', value: 79400 }, { label: 'Sun', value: 75600 }], platformBreakdown: [{ platform: 'instagram', followers: 68400, engagementRate: 8.9, trafficShare: 43 }, { platform: 'x', followers: 31400, engagementRate: 6.4, trafficShare: 27 }, { platform: 'linkedin', followers: 22600, engagementRate: 5.8, trafficShare: 19 }, { platform: 'youtube', followers: 6000, engagementRate: 4.9, trafficShare: 11 }] },
    { workspaceId: 'ws-vanta', range: '30d', summary: { followers: { current: 86400, previous: 79300, change: 8.95 }, impressions: { current: 704200, previous: 645100, change: 9.16 }, engagementRate: { current: 7.31, previous: 6.65, change: 9.92 }, ctr: { current: 2.88, previous: 2.66, change: 8.27 } }, engagementTrend: [{ label: 'Mon', value: 6.3 }, { label: 'Tue', value: 6.7 }, { label: 'Wed', value: 7.0 }, { label: 'Thu', value: 7.8 }, { label: 'Fri', value: 7.5 }, { label: 'Sat', value: 7.1 }, { label: 'Sun', value: 6.9 }], reachTrend: [{ label: 'Mon', value: 88200 }, { label: 'Tue', value: 92400 }, { label: 'Wed', value: 95200 }, { label: 'Thu', value: 100100 }, { label: 'Fri', value: 98200 }, { label: 'Sat', value: 94600 }, { label: 'Sun', value: 93100 }], platformBreakdown: [{ platform: 'tiktok', followers: 42100, engagementRate: 8.1, trafficShare: 49 }, { platform: 'instagram', followers: 31200, engagementRate: 7.3, trafficShare: 34 }, { platform: 'x', followers: 13100, engagementRate: 5.2, trafficShare: 17 }] },
    { workspaceId: 'ws-rivet', range: '30d', summary: { followers: { current: 172300, previous: 165500, change: 4.11 }, impressions: { current: 512300, previous: 489100, change: 4.74 }, engagementRate: { current: 5.44, previous: 5.08, change: 7.09 }, ctr: { current: 4.01, previous: 3.66, change: 9.56 } }, engagementTrend: [{ label: 'Mon', value: 4.9 }, { label: 'Tue', value: 5.2 }, { label: 'Wed', value: 5.5 }, { label: 'Thu', value: 5.7 }, { label: 'Fri', value: 5.8 }, { label: 'Sat', value: 5.3 }, { label: 'Sun', value: 5.1 }], reachTrend: [{ label: 'Mon', value: 60600 }, { label: 'Tue', value: 64500 }, { label: 'Wed', value: 68900 }, { label: 'Thu', value: 70100 }, { label: 'Fri', value: 72000 }, { label: 'Sat', value: 65800 }, { label: 'Sun', value: 61200 }], platformBreakdown: [{ platform: 'facebook', followers: 83400, engagementRate: 4.8, trafficShare: 39 }, { platform: 'instagram', followers: 70100, engagementRate: 5.7, trafficShare: 35 }, { platform: 'whatsapp', followers: 18800, engagementRate: 6.1, trafficShare: 26 }] },
  ];

  for (const a of analyticsData) {
    await prisma.analytics.create({ data: a });
  }

  await prisma.schedulerSlot.createMany({
    data: [
      { id: 'sch-aur-001', workspaceId: 'ws-aurora', title: 'BTS Carousel', platforms: [Platform.linkedin, Platform.instagram], scheduledFor: d('2026-04-28T11:30:00Z'), status: SchedulerStatus.scheduled, postId: 'post-aur-002' },
      { id: 'sch-aur-002', workspaceId: 'ws-aurora', title: 'Weekly tips thread', platforms: [Platform.x], scheduledFor: d('2026-04-29T14:00:00Z'), status: SchedulerStatus.scheduled, postId: null },
      { id: 'sch-van-001', workspaceId: 'ws-vanta', title: 'Teaser Thread', platforms: [Platform.x], scheduledFor: d('2026-04-28T13:00:00Z'), status: SchedulerStatus.scheduled, postId: 'post-van-002' },
      { id: 'sch-riv-001', workspaceId: 'ws-rivet', title: 'Loyalty Broadcast', platforms: [Platform.whatsapp], scheduledFor: d('2026-04-28T07:45:00Z'), status: SchedulerStatus.draft, postId: 'post-riv-002' },
    ],
  });

  await prisma.platformConnection.createMany({
    data: [
      { id: 'plat-aur-ig', workspaceId: 'ws-aurora', platform: Platform.instagram, status: PlatformConnectionStatus.connected, account: '@auroralabs', followers: 68400, bio: 'Building the future of work. ⚡', website: 'https://auroralabs.io' },
      { id: 'plat-aur-x', workspaceId: 'ws-aurora', platform: Platform.x, status: PlatformConnectionStatus.connected, account: '@auroralabs', followers: 31400, bio: 'Products for builders.', website: 'https://auroralabs.io' },
      { id: 'plat-aur-li', workspaceId: 'ws-aurora', platform: Platform.linkedin, status: PlatformConnectionStatus.connected, account: 'Aurora Labs', followers: 22600, bio: 'Aurora Labs — Growth Infrastructure', website: 'https://auroralabs.io' },
      { id: 'plat-aur-yt', workspaceId: 'ws-aurora', platform: Platform.youtube, status: PlatformConnectionStatus.connected, account: 'Aurora Labs Media', followers: 6000, bio: 'Tutorials, demos and launches.', website: 'https://auroralabs.io' },
      { id: 'plat-van-ig', workspaceId: 'ws-vanta', platform: Platform.instagram, status: PlatformConnectionStatus.expiring, account: '@vantamotion', followers: 31200, bio: 'Motion design studio.', website: 'https://vantamotion.co' },
      { id: 'plat-van-tt', workspaceId: 'ws-vanta', platform: Platform.tiktok, status: PlatformConnectionStatus.connected, account: '@vantamotion', followers: 42100, bio: 'We make things move.', website: 'https://vantamotion.co' },
      { id: 'plat-van-x', workspaceId: 'ws-vanta', platform: Platform.x, status: PlatformConnectionStatus.connected, account: '@vantamotion', followers: 13100, bio: 'Motion design & creative direction.', website: 'https://vantamotion.co' },
      { id: 'plat-riv-fb', workspaceId: 'ws-rivet', platform: Platform.facebook, status: PlatformConnectionStatus.connected, account: 'Rivet Retail', followers: 83400, bio: 'Your everyday essentials store.', website: 'https://rivetretail.com' },
      { id: 'plat-riv-ig', workspaceId: 'ws-rivet', platform: Platform.instagram, status: PlatformConnectionStatus.connected, account: '@rivetretail', followers: 70100, bio: 'Shop the look. 🛍️', website: 'https://rivetretail.com' },
      { id: 'plat-riv-wa', workspaceId: 'ws-rivet', platform: Platform.whatsapp, status: PlatformConnectionStatus.connected, account: '+1 415 228 0184', followers: 18800, bio: 'Customer support & offers.', website: 'https://rivetretail.com' },
    ],
  });

  console.log('\nSeed complete.\n');
  console.log('Demo login: rita@nexus.app');
  console.log(`Demo password: ${DEMO_PASSWORD}\n`);
  console.log('TOTP setup — add these to your authenticator app:\n');
  for (const info of totpInfo) {
    console.log(`  ${info.email}`);
    console.log(`    Secret:      ${info.secret}`);
    console.log(`    otpauth URL: ${info.otpauthUrl}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
