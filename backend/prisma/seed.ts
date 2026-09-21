import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@digitalheroes.com' },
    update: {},
    create: {
      email: 'admin@digitalheroes.com',
      name: 'Platform Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const subscriberPasswordHash = await bcrypt.hash('Subscriber@12345', 12);
  await prisma.user.upsert({
    where: { email: 'subscriber@digitalheroes.com' },
    update: {},
    create: {
      email: 'subscriber@digitalheroes.com',
      name: 'Demo Golfer',
      passwordHash: subscriberPasswordHash,
      role: Role.SUBSCRIBER,
    },
  });

  const charities = [
    {
      name: 'Fairway Futures Foundation',
      description: 'Funds junior golf coaching and equipment access in underserved communities.',
      isFeatured: true,
    },
    {
      name: 'Greenkeepers for Good',
      description: 'Restores public course land into community green spaces after closures.',
      isFeatured: false,
    },
    {
      name: "Caddie's Promise",
      description: 'Provides scholarships to caddies pursuing higher education.',
      isFeatured: false,
    },
  ];

  // Charity.name has no unique constraint (two orgs could share a display
  // name in production), so seeding uses check-then-create for idempotency
  // instead of `upsert`.
  for (const c of charities) {
    const existing = await prisma.charity.findFirst({ where: { name: c.name } });
    if (!existing) await prisma.charity.create({ data: c });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`   Admin login:      ${admin.email} / Admin@12345`);
  // eslint-disable-next-line no-console
  console.log('   Subscriber login: [email protected] / Subscriber@12345');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
