import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const getMyDonations = asyncHandler(async (req: Request, res: Response) => {
  const donations = await prisma.donation.findMany({
    where: { userId: req.user!.id },
    include: {
      charity: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ donations });
});
