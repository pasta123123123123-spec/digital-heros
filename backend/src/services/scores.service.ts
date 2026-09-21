import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

const MAX_SCORES = 5;

/**
 * PRD §05: "Users must enter their last 5 golf scores... a new score
 * replaces the oldest stored score automatically." Enforced here, in the
 * service layer, not trusted from the client and not left to a DB trigger
 * (keeping the business rule visible and testable in application code).
 */
export async function addScore(userId: string, value: number, playedOn: Date) {
  if (value < 1 || value > 45) {
    throw AppError.badRequest('Score must be a Stableford value between 1 and 45');
  }

  const existingForDate = await prisma.score.findUnique({
    where: { userId_playedOn: { userId, playedOn } },
  });
  if (existingForDate) {
    throw AppError.conflict(
      'A score already exists for this date. Edit or delete it instead of adding a duplicate.'
    );
  }

  return prisma.$transaction(async (tx) => {
    const count = await tx.score.count({ where: { userId } });

    if (count >= MAX_SCORES) {
      const oldest = await tx.score.findFirst({
        where: { userId },
        orderBy: { playedOn: 'asc' },
      });
      if (oldest) await tx.score.delete({ where: { id: oldest.id } });
    }

    return tx.score.create({ data: { userId, value, playedOn } });
  });
}

export async function updateScore(userId: string, scoreId: string, value?: number, playedOn?: Date) {
  if (value !== undefined && (value < 1 || value > 45)) {
    throw AppError.badRequest('Score must be a Stableford value between 1 and 45');
  }

  return prisma.$transaction(async (tx) => {
    const score = await tx.score.findUnique({ where: { id: scoreId } });
    if (!score || score.userId !== userId) throw AppError.notFound('Score not found');

    if (playedOn !== undefined) {
      const existingForDate = await tx.score.findFirst({
        where: { userId, playedOn, id: { not: scoreId } },
      });
      if (existingForDate) {
        throw AppError.conflict(
          'A score already exists for this date. Edit or delete it instead of duplicating.'
        );
      }
    }

    return tx.score.update({
      where: { id: scoreId },
      data: {
        ...(value !== undefined && { value }),
        ...(playedOn !== undefined && { playedOn }),
      },
    });
  });
}

export async function deleteScore(userId: string, scoreId: string) {
  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score || score.userId !== userId) throw AppError.notFound('Score not found');
  await prisma.score.delete({ where: { id: scoreId } });
}

export async function listScores(userId: string) {
  return prisma.score.findMany({
    where: { userId },
    orderBy: { playedOn: 'desc' }, // most recent first, per PRD §05
  });
}

/** Used by the draw engine's ALGORITHMIC mode. Null if the user has no scores yet. */
export async function getRecentScoreAverage(userId: string): Promise<number | null> {
  const scores = await prisma.score.findMany({
    where: { userId },
    orderBy: { playedOn: 'desc' },
    take: MAX_SCORES,
  });
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
}
