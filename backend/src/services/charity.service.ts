import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function listCharities(search?: string, category?: string) {
  return prisma.charity.findMany({
    where: {
      isActive: true,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
      ...(category ? { categories: { has: category } } : {}),
    },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });
}

export async function getFeaturedCharity() {
  return prisma.charity.findFirst({
    where: { isActive: true, isFeatured: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCharity(id: string) {
  const charity = await prisma.charity.findUnique({
    where: { id },
    include: { events: { orderBy: { date: 'asc' } } },
  });
  if (!charity) throw AppError.notFound('Charity not found');
  return charity;
}

export async function createCharity(data: {
  name: string;
  description: string;
  categories?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  isFeatured?: boolean;
}) {
  return prisma.charity.create({ data });
}

export async function updateCharity(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    categories: string[];
    imageUrl: string;
    imageUrls: string[];
    isFeatured: boolean;
    isActive: boolean;
  }>
) {
  await getCharity(id);
  return prisma.charity.update({ where: { id }, data });
}

export async function deleteCharity(id: string) {
  await getCharity(id);
  // Soft delete — a charity that subscribers have already chosen must
  // remain referenceable for historical subscription rows.
  return prisma.charity.update({ where: { id }, data: { isActive: false } });
}
