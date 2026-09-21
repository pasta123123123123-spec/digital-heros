import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function listMyClaims(userId: string) {
  return prisma.winnerClaim.findMany({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function submitProof(userId: string, claimId: string, proofUrl: string) {
  const claim = await prisma.winnerClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.userId !== userId) throw AppError.notFound('Claim not found');
  if (claim.status !== 'PENDING') {
    throw AppError.conflict('This claim has already been reviewed and cannot be resubmitted');
  }

  return prisma.winnerClaim.update({
    where: { id: claimId },
    data: { proofUrl },
  });
}

export async function listAllClaims(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID') {
  return prisma.winnerClaim.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function reviewClaim(
  adminId: string,
  claimId: string,
  decision: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) {
  const claim = await prisma.winnerClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw AppError.notFound('Claim not found');
  if (claim.status !== 'PENDING') {
    throw AppError.conflict('Only pending claims can be reviewed');
  }
  if (decision === 'REJECTED' && !rejectionReason) {
    throw AppError.badRequest('A rejection reason is required');
  }

  return prisma.winnerClaim.update({
    where: { id: claimId },
    data: {
      status: decision,
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: decision === 'REJECTED' ? rejectionReason : null,
    },
  });
}

export async function markPaid(claimId: string) {
  const claim = await prisma.winnerClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw AppError.notFound('Claim not found');
  if (claim.status !== 'APPROVED') {
    throw AppError.conflict('Only approved claims can be marked as paid');
  }

  return prisma.winnerClaim.update({
    where: { id: claimId },
    data: { status: 'PAID', paidAt: new Date() },
  });
}
