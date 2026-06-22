import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(requireEnv('PORT')),
  nodeEnv: requireEnv('NODE_ENV'),
  isProd: requireEnv('NODE_ENV') === 'production',
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('REDIS_URL'),
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpires: requireEnv('JWT_ACCESS_EXPIRES'),
    refreshExpires: requireEnv('JWT_REFRESH_EXPIRES'),
  },
  corsOrigins: requireEnv('CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export default env;
