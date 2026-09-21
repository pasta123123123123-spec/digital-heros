import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { registerDrawReminderCron } from './jobs/drawReminder.cron';

async function main() {
  // Fail fast if the DB is unreachable rather than starting a server that
  // will 500 on every request.
  await prisma.$connect();
  // eslint-disable-next-line no-console
  console.log('✅ Connected to Neon Postgres');

  // See ASSUMPTIONS.md §5 — this is a lightweight reminder cron, not a job
  // queue. It does not run the draw itself; an admin still reviews and
  // triggers simulate/publish from the dashboard.
  registerDrawReminderCron();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Digital Heroes API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
