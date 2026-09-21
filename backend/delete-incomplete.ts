import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.subscription.deleteMany({
    where: { status: 'INCOMPLETE' },
  });
  console.log(`Deleted ${result.count} INCOMPLETE subscriptions.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
