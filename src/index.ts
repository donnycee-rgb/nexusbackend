import app from './app.js';
import { env } from './config/env.js';
import { connectRedis } from './lib/redis.js';
import { prisma } from './lib/prisma.js';

async function main() {
  await connectRedis();
  await prisma.$connect();

  app.listen(env.port, () => {
    console.log(`backendmosaic listening on http://localhost:${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
