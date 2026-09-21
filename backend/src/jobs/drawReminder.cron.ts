import cron from 'node-cron';
import { prisma } from '../config/prisma';

/**
 * ASSUMPTIONS.md §5: the PRD only requires a "monthly cadence" with "admin
 * controls publishing" — it does not require unattended automatic draws.
 * Rather than pull in BullMQ + Redis for this, we run a single lightweight
 * cron check once a day that logs (and in production would email/notify)
 * whichever admin needs to run this month's draw if it hasn't been done yet.
 *
 * This intentionally does NOT call simulateDraw/publishDraw itself — a
 * human always reviews the simulation before anything is published, per
 * PRD §11 ("admin controls publishing").
 *
 * Swapping this for a real queue later is a scheduling-layer change only;
 * see drawEngine.ts / draw.service.ts, which are already queue-agnostic.
 */
export function registerDrawReminderCron() {
  // Runs once a day at 09:00 server time.
  cron.schedule('0 9 * * *', async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      const draw = await prisma.draw.findUnique({ where: { month_year: { month, year } } });
      if (!draw || draw.status === 'DRAFT') {
        // eslint-disable-next-line no-console
        console.log(
          `[draw-reminder] No draw simulated yet for ${month}/${year}. An admin should run one from the dashboard.`
        );
      }
    } catch (err) {
      // A failed reminder check should never crash the process.
      // eslint-disable-next-line no-console
      console.error('[draw-reminder] Failed to check draw status:', err);
    }
  });
}
