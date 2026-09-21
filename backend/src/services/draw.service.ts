import { DrawType, MatchTier, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { runDraw } from './drawEngine';
import { calculatePoolSnapshot, computeRolloverOut, splitAmongWinners } from './poolCalculator';
import { getRecentScoreAverage } from './scores.service';
import { env } from '../config/env';

const MONTHLY_FEE = 15; // demo figure — in a real system this comes from Stripe price objects
const YEARLY_FEE = 150;

async function getEligibleSubscribersWithScores() {
  const subs = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.ACTIVE },
    select: { userId: true },
  });

  return Promise.all(
    subs.map(async (s) => ({
      userId: s.userId,
      recentScoreAvg: await getRecentScoreAverage(s.userId),
    }))
  );
}

async function getPreviousRollover(month: number, year: number): Promise<number> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDraw = await prisma.draw.findUnique({
    where: { month_year: { month: prevMonth, year: prevYear } },
  });
  return prevDraw ? Number(prevDraw.jackpotRolloverOut) : 0;
}

/**
 * Runs the draw logic and returns the outcome WITHOUT persisting winners or
 * marking the draw published — admins can review numbers before committing.
 * Uses the exact same runDraw()/calculatePoolSnapshot() functions publish
 * uses, per ASSUMPTIONS.md §1.
 */
export async function simulateDraw(month: number, year: number, type: DrawType) {
  const existing = await prisma.draw.findUnique({ where: { month_year: { month, year } } });
  if (existing?.status === 'PUBLISHED') {
    throw AppError.conflict('This draw has already been published and cannot be re-simulated');
  }

  const [subscribers, activeMonthly, activeYearly, rolloverIn] = await Promise.all([
    getEligibleSubscribersWithScores(),
    prisma.subscription.count({ where: { status: 'ACTIVE', plan: 'MONTHLY' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', plan: 'YEARLY' } }),
    getPreviousRollover(month, year),
  ]);

  if (subscribers.length === 0) {
    throw AppError.badRequest('No active subscribers are eligible for this draw cycle');
  }

  const pool = calculatePoolSnapshot({
    activeMonthlySubscriberCount: activeMonthly,
    activeYearlySubscriberCount: activeYearly,
    monthlyFeeAmount: MONTHLY_FEE,
    yearlyFeeAmount: YEARLY_FEE,
    jackpotRolloverIn: rolloverIn,
  });

  const outcome = runDraw(subscribers, type);

  const draw = await prisma.draw.upsert({
    where: { month_year: { month, year } },
    update: {
      type,
      status: 'SIMULATED',
      eligibleSubscriberCount: pool.eligibleSubscriberCount,
      totalPoolAmount: pool.totalPoolAmount,
      poolShareFive: pool.poolShareFive,
      poolShareFour: pool.poolShareFour,
      poolShareThree: pool.poolShareThree,
      jackpotRolloverIn: rolloverIn,
      winningNumbers: outcome.winningNumbers,
      simulatedAt: new Date(),
    },
    create: {
      month,
      year,
      type,
      status: 'SIMULATED',
      eligibleSubscriberCount: pool.eligibleSubscriberCount,
      totalPoolAmount: pool.totalPoolAmount,
      poolShareFive: pool.poolShareFive,
      poolShareFour: pool.poolShareFour,
      poolShareThree: pool.poolShareThree,
      jackpotRolloverIn: rolloverIn,
      winningNumbers: outcome.winningNumbers,
      simulatedAt: new Date(),
    },
  });

  return { draw, outcome, pool };
}

/**
 * Persists simulated results as final: writes tickets, DrawResult rows per
 * tier, computes rollover-out for an unclaimed jackpot (ASSUMPTIONS.md §3),
 * and creates WinnerClaim rows for admins to verify (PRD §09).
 */
export async function publishDraw(month: number, year: number, type: DrawType) {
  // Re-run the same deterministic simulate step immediately before publish
  // so the persisted result reflects the eligible-subscriber population at
  // the moment of publishing, not a possibly-stale earlier simulation.
  const { draw, outcome, pool } = await simulateDraw(month, year, type);

  return prisma.$transaction(async (tx) => {
    await tx.drawTicket.createMany({
      data: outcome.tickets.map((t) => ({
        drawId: draw.id,
        userId: t.userId,
        numbers: t.numbers,
        matchTier: t.matchTier,
      })),
      skipDuplicates: true,
    });

    const tierPools: Record<MatchTier, number> = {
      FIVE: pool.poolShareFive,
      FOUR: pool.poolShareFour,
      THREE: pool.poolShareThree,
    };

    for (const tier of ['FIVE', 'FOUR', 'THREE'] as MatchTier[]) {
      const winners = outcome.winnersByTier[tier];
      if (winners.length === 0) continue;

      const perWinnerAmount = splitAmongWinners(tierPools[tier], winners.length);

      const result = await tx.drawResult.create({
        data: {
          drawId: draw.id,
          matchTier: tier,
          poolAmount: tierPools[tier],
          winnerUserIds: winners,
        },
      });

      await tx.winnerClaim.createMany({
        data: winners.map((userId) => ({
          drawResultId: result.id,
          userId,
          amountDue: perWinnerAmount,
        })),
      });
    }

    const rolloverOut = computeRolloverOut(outcome.winnersByTier.FIVE.length, pool.poolShareFive);

    const publishedDraw = await tx.draw.update({
      where: { id: draw.id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), jackpotRolloverOut: rolloverOut },
    });

    return publishedDraw;
  });
}

export async function getDraw(month: number, year: number) {
  const draw = await prisma.draw.findUnique({
    where: { month_year: { month, year } },
    include: { results: true },
  });
  if (!draw) throw AppError.notFound('No draw found for that month/year');
  return draw;
}

export async function listDraws() {
  return prisma.draw.findMany({ orderBy: [{ year: 'desc' }, { month: 'desc' } ] });
}

export async function getMyDrawParticipation(userId: string) {
  const tickets = await prisma.drawTicket.findMany({
    where: { userId },
    include: { draw: { select: { month: true, year: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const upcomingDrawExists = await prisma.draw.findFirst({
    where: { status: { in: ['DRAFT', 'SIMULATED'] } },
  });

  return { tickets, hasUpcomingDraw: Boolean(upcomingDrawExists) };
}

// Referenced by admin controller so it can display the configured ticket shape.
export const drawConfig = {
  ticketLength: env.DRAW_TICKET_LENGTH,
  numberRange: env.DRAW_TICKET_NUMBER_RANGE,
};
