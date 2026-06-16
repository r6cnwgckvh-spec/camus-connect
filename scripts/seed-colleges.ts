import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const response = await fetch('http://universities.hipolabs.com/search?country=India');
  const data = await response.json();

  const seen = new Map<string, any>();
  for (const item of data) {
    const key = item.name;
    if (!seen.has(key)) {
      seen.set(key, item);
    } else if (!seen.get(key)['state-province'] && item['state-province']) {
      seen.set(key, item);
    }
  }

  const colleges = Array.from(seen.values()).map((item) => ({
    name: item.name,
    city: '',
    state: item['state-province'] || '',
    type: 'Other',
    affiliation: 'Other',
  }));

  console.log(`Seeding ${colleges.length} colleges...`);

  for (const college of colleges) {
    await prisma.college.upsert({
      where: {
        name_city_state: {
          name: college.name,
          city: college.city,
          state: college.state,
        },
      },
      update: {},
      create: college,
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
