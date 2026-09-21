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
      categories: ['Youth', 'Community'],
      imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12fc416?q=80&w=2070&auto=format&fit=crop',
      imageUrls: [
        'https://images.unsplash.com/photo-1535136154160-5f21226068cd?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070&auto=format&fit=crop',
      ],
      events: {
        create: [
          {
            title: 'Annual Youth Golf Clinic',
            description: 'A free 3-day clinic for under-16s with professional coaching.',
            date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12fc416?q=80&w=2070&auto=format&fit=crop',
          }
        ]
      }
    },
    {
      name: 'Greenkeepers for Good',
      description: 'Restores public course land into community green spaces after closures.',
      isFeatured: false,
      categories: ['Environment', 'Community'],
      imageUrl: 'https://images.unsplash.com/photo-1535136154160-5f21226068cd?q=80&w=2070&auto=format&fit=crop',
      imageUrls: [],
    },
    {
      name: "Caddie's Promise",
      description: 'Provides scholarships to caddies pursuing higher education.',
      isFeatured: false,
      categories: ['Youth', 'Education'],
      imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070&auto=format&fit=crop',
      imageUrls: [],
      events: {
        create: [
          {
            title: 'Charity Scramble Tournament',
            description: '4-person scramble to raise funds for the Fall 2027 scholarship class.',
            date: new Date(new Date().setMonth(new Date().getMonth() + 2)),
          }
        ]
      }
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
