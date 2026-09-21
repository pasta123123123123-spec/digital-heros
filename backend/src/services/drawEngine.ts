import crypto from 'crypto';
import { DrawType, MatchTier } from '@prisma/client';
import { env } from '../config/env';

export interface SubscriberInput {
  userId: string;
  /** Average Stableford score across their last up-to-5 rounds, or null if none entered. */
  recentScoreAvg: number | null;
}

export interface Ticket {
  userId: string;
  numbers: number[];
}

export interface DrawOutcome {
  winningNumbers: number[];
  tickets: (Ticket & { matchTier: MatchTier | null })[];
  winnersByTier: Record<MatchTier, string[]>; // userIds
}

const RANGE = env.DRAW_TICKET_NUMBER_RANGE; // e.g. 1–49
const LENGTH = env.DRAW_TICKET_LENGTH; // e.g. 5

/**
 * Draw engine — see ASSUMPTIONS.md §1 for the full reasoning. Kept as pure
 * functions (no DB, no HTTP) so:
 *  - "Simulate" and "Publish" call the exact same logic, with only the
 *    persistence layer around it differing.
 *  - The RNG can be swapped for a seeded one in tests, making outcomes
 *    reproducible and unit-testable.
 */

/**
 * Generates a single ticket of `LENGTH` unique numbers in [1, RANGE].
 *
 * RANDOM mode: uniform via crypto.randomInt (cryptographically sound,
 * not Math.random — this is picking numbers for a prize draw).
 *
 * ALGORITHMIC mode: soft-weights the draw toward numbers that are less
 * "hot" as the subscriber's recent score average rises, so a stronger/more
 * consistent golfer's ticket differs meaningfully from a coin flip without
 * the PRD ever having defined a literal score→number mapping (there isn't
 * one — see ASSUMPTIONS.md §1).
 */
export function generateTicket(
  type: DrawType,
  recentScoreAvg: number | null,
  rng: () => number = () => crypto.randomInt(1, RANGE + 1)
): number[] {
  const numbers = new Set<number>();

  if (type === 'RANDOM' || recentScoreAvg === null) {
    while (numbers.size < LENGTH) numbers.add(rng());
    return [...numbers].sort((a, b) => a - b);
  }

  // ALGORITHMIC: bias away from a "hot band" of numbers proportional to
  // score strength. Stableford: higher average = stronger play. We map the
  // average onto a rotating offset so results stay well distributed across
  // subscribers rather than everyone with a similar handicap colliding on
  // the same numbers.
  const bias = Math.min(Math.max(recentScoreAvg, 0), 45);
  const skip = Math.floor((bias / 45) * RANGE);

  while (numbers.size < LENGTH) {
    let n = rng();
    n = ((n + skip - 1) % RANGE) + 1; // rotate into a biased band, stay in [1, RANGE]
    numbers.add(n);
  }

  return [...numbers].sort((a, b) => a - b);
}

export function countMatches(ticket: number[], winning: number[]): number {
  const winningSet = new Set(winning);
  return ticket.filter((n) => winningSet.has(n)).length;
}

export function matchCountToTier(count: number): MatchTier | null {
  if (count >= 5) return 'FIVE';
  if (count === 4) return 'FOUR';
  if (count === 3) return 'THREE';
  return null;
}

/**
 * Runs a full draw cycle against a list of eligible subscribers.
 * Deterministic given the same `rng` — used identically by both the
 * "simulate" (no persistence) and "publish" (persists results) code paths.
 */
export function runDraw(
  subscribers: SubscriberInput[],
  type: DrawType,
  rng?: () => number
): DrawOutcome {
  const winningNumbers = generateTicket(type, null, rng); // house draw is always unweighted

  const tickets = subscribers.map((s) => {
    const numbers = generateTicket(type, s.recentScoreAvg, rng);
    const matches = countMatches(numbers, winningNumbers);
    const matchTier = matchCountToTier(matches);
    return { userId: s.userId, numbers, matchTier };
  });

  const winnersByTier: Record<MatchTier, string[]> = { FIVE: [], FOUR: [], THREE: [] };
  for (const t of tickets) {
    if (t.matchTier) winnersByTier[t.matchTier].push(t.userId);
  }

  return { winningNumbers, tickets, winnersByTier };
}
