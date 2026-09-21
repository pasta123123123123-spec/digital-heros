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
      imageUrl: 'https://picsum.photos/seed/fairway1/1200/800',
      imageUrls: [
        'https://picsum.photos/seed/fairway2/800/800',
        'https://picsum.photos/seed/fairway3/800/800',
        'https://picsum.photos/seed/fairway4/800/800',
      ],
      events: {
        create: [
          {
            title: 'Annual Youth Golf Clinic',
            description: 'A free 3-day clinic for under-16s with professional coaching.',
            date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            imageUrl: 'https://picsum.photos/seed/clinic/1200/800',
          }
        ]
      }
    },
    {
      name: 'Greenkeepers for Good',
      description: 'Restores public course land into community green spaces after closures.',
      isFeatured: false,
      categories: ['Environment', 'Community'],
      imageUrl: 'https://picsum.photos/seed/green1/1200/800',
      imageUrls: [
        'https://picsum.photos/seed/green2/800/800',
        'https://picsum.photos/seed/green3/800/800',
      ],
    },
    {
      name: "Caddie's Promise",
      description: 'Provides scholarships to caddies pursuing higher education.',
      isFeatured: false,
      categories: ['Youth', 'Education'],
      imageUrl: 'https://picsum.photos/seed/caddie1/1200/800',
      imageUrls: [
        'https://picsum.photos/seed/caddie2/800/800',
        'https://picsum.photos/seed/caddie3/800/800',
      ],
      events: {
        create: [
          {
            title: 'Charity Scramble Tournament',
            description: '4-person scramble to raise funds for the Fall 2027 scholarship class.',
            date: new Date(new Date().setMonth(new Date().getMonth() + 2)),
            imageUrl: 'https://picsum.photos/seed/scramble/1200/800',
          }
        ]
      }
    },
  ];

  for (const c of charities) {
    const existing = await prisma.charity.findFirst({ where: { name: c.name } });
    if (existing) {
      // Extract events to prevent duplicate event creation on update, 
      // or just update scalar fields.
      const { events, ...charityData } = c;
      await prisma.charity.update({ where: { id: existing.id }, data: charityData });
    } else {
      await prisma.charity.create({ data: c });
    }
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
