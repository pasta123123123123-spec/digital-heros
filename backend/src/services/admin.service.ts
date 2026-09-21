import { prisma } from '../config/prisma';

/**
 * Deliberately kept as a handful of direct aggregate queries rather than a
 * materialized view or BI layer — the PRD's admin reporting needs (§11) are
 * simple totals, and over-engineering this for a project this size adds
 * maintenance cost without real benefit. If reporting needs grow, this is
 * the seam to swap in a scheduled materialized-view refresh.
 */
export async function getAdminOverview() {
  const [totalUsers, activeSubscribers, totalPrizePoolPaid, charityContributions, drawStats] =
    await Promise.all([
      prisma.user.count({ where: { role: 'SUBSCRIBER' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.winnerClaim.aggregate({
        where: { status: 'PAID' },
        _sum: { amountDue: true },
      }),
      prisma.subscription.groupBy({
        by: ['charityId'],
        where: { status: 'ACTIVE', charityId: { not: null } },
        _count: { _all: true },
      }),
      prisma.draw.aggregate({
        _count: { _all: true },
        where: { status: 'PUBLISHED' },
      }),
    ]);

  return {
    totalUsers,
    activeSubscribers,
    totalPrizePoolPaid: totalPrizePoolPaid._sum.amountDue ?? 0,
    charityContributionCounts: charityContributions,
    totalDrawsPublished: drawStats._count._all,
  };
}

export async function updateUserProfile(userId: string, data: { name?: string; email?: string }) {
  // TODO: Add an audit trail here for real prize-money accountability
  // e.g. console.log(`[AUDIT] Admin updated user ${userId} profile with ${JSON.stringify(data)}`);
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
  });
}
