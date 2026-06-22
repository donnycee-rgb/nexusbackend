/** Static API reference data — not demo workspace content. */
export const PLATFORM_META = {
  instagram: { name: 'Instagram', color: '#E1306C', short: 'IG' },
  tiktok: { name: 'TikTok', color: '#FF0050', short: 'TT' },
  facebook: { name: 'Facebook', color: '#1877F2', short: 'FB' },
  x: { name: 'X', color: '#E7E9EA', short: 'X' },
  youtube: { name: 'YouTube', color: '#FF0000', short: 'YT' },
  whatsapp: { name: 'WhatsApp', color: '#25D366', short: 'WA' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', short: 'LI' },
} as const;

export const ALL_PERMISSIONS = [
  'compose_posts',
  'publish_posts',
  'delete_posts',
  'view_analytics',
  'reply_messages',
  'schedule_posts',
  'manage_profiles',
  'use_kill_switch',
  'access_admin',
] as const;

export const MOCK_SONGS = [
  { id: 1, title: 'Espresso', artist: 'Sabrina Carpenter', trending: true },
  { id: 2, title: 'Harleys in Hawaii', artist: 'Katy Perry', trending: true },
  { id: 3, title: 'Flowers', artist: 'Miley Cyrus', trending: false },
  { id: 4, title: 'As It Was', artist: 'Harry Styles', trending: true },
  { id: 5, title: 'Unholy', artist: 'Sam Smith ft Kim Petras', trending: false },
  { id: 6, title: 'Creepin', artist: 'Metro Boomin', trending: false },
] as const;
