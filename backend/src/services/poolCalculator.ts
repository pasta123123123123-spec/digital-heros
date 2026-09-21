import { env } from '../config/env';

export const TIER_SHARES = {
  FIVE: 0.4,
  FOUR: 0.35,
  THREE: 0.25,
} as const;

export interface PoolSnapshotInput {
  activeMonthlySubscriberCount: number;
  activeYearlySubscriberCount: number;
  monthlyFeeAmount: number; // in the smallest currency unit's major form, e.g. dollars
  yearlyFeeAmount: number;
  jackpotRolloverIn: number; // carried in from previous unclaimed cycles
}

export interface PoolSnapshot {
  eligibleSubscriberCount: number;
  totalPoolAmount: number;
  poolShareFive: number; // includes rollover
  poolShareFour: number;
  poolShareThree: number;
}

/**
 * Calculates the prize pool ONCE, as a point-in-time snapshot — never as a
 * live/continuously-updating balance. See ASSUMPTIONS.md §2 for why: a
 * real-time pool makes "simulate then publish" non-deterministic, since the
 * numbers could shift between the two actions if a subscription changes.
 *
 * Yearly subscribers contribute their monthly-equivalent share only, so one
 * annual signup doesn't distort a single month's pool (ASSUMPTIONS.md §2).
 */
export function calculatePoolSnapshot(input: PoolSnapshotInput): PoolSnapshot {
  const pct = env.PRIZE_POOL_CONTRIBUTION_PCT / 100;

  const monthlyContribution = input.activeMonthlySubscriberCount * input.monthlyFeeAmount * pct;
  const yearlyMonthlyEquivalentContribution =
    input.activeYearlySubscriberCount * (input.yearlyFeeAmount / 12) * pct;

  const totalPoolAmount = round2(monthlyContribution + yearlyMonthlyEquivalentContribution);

  const poolShareFive = round2(totalPoolAmount * TIER_SHARES.FIVE + input.jackpotRolloverIn);
  const poolShareFour = round2(totalPoolAmount * TIER_SHARES.FOUR);
  const poolShareThree = round2(totalPoolAmount * TIER_SHARES.THREE);

  return {
    eligibleSubscriberCount:
      input.activeMonthlySubscriberCount + input.activeYearlySubscriberCount,
    totalPoolAmount,
    poolShareFive,
    poolShareFour,
    poolShareThree,
  };
}

/**
 * Splits a tier's pool amount equally among however many winners matched
 * that tier this cycle (PRD §07: "Prizes split equally among multiple
 * winners in the same tier").
 */
export function splitAmongWinners(poolAmount: number, winnerCount: number): number {
  if (winnerCount <= 0) return 0;
  return round2(poolAmount / winnerCount);
}

/**
 * ASSUMPTIONS.md §3: "unclaimed" = no ticket matched all 5 numbers this
 * cycle — a draw-outcome condition. This is distinct from a forfeiture
 * (a winner was identified but failed verification), which is handled
 * separately in winner.service.ts so the two causes stay reportable apart.
 */
export function computeRolloverOut(fiveMatchWinnerCount: number, poolShareFive: number): number {
  return fiveMatchWinnerCount === 0 ? poolShareFive : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
