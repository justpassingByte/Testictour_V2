import { prisma } from '../src/services/prisma';

async function seedPlans() {
  console.log('Seeding Subscription Plans...');

  const plans = [
    {
      plan: 'STARTER',
      displayName: 'Starter Partner',
      description: 'Bắt đầu nhanh, thay thế hoàn toàn Google Sheets',
      monthlyPrice: 25,
      earlyAccessPrice: 19,
      annualPrice: 250,
      maxLobbies: -1,
      maxTournamentSize: 128,
      maxTournamentsPerMonth: 5,
      platformFeePercent: 0.05,
      features: { 
        autoMatchResult: false,
        gateway: false,
        customReward: false,
        reservePlayer: false,
        autoPayout: false,
        advancedAnalytics: false
      },
      sortOrder: 1,
    },
    {
      plan: 'PRO',
      displayName: 'PRO Partner',
      description: 'Tự động hóa vận hành + giữ chân player',
      monthlyPrice: 49,
      earlyAccessPrice: 39,
      annualPrice: 490,
      maxLobbies: -1,
      maxTournamentSize: -1,
      maxTournamentsPerMonth: 10,
      platformFeePercent: 0.05,
      features: { 
        autoMatchResult: true,
        gateway: true,
        customReward: true,
        reservePlayer: true,
        autoPayout: false,
        advancedAnalytics: true
      },
      sortOrder: 2,
    },
    {
      plan: 'ENTERPRISE',
      displayName: 'Enterprise Partner',
      description: 'Scale lớn + vận hành chuyên nghiệp',
      monthlyPrice: 99,
      earlyAccessPrice: null,
      annualPrice: 990,
      maxLobbies: -1,
      maxTournamentSize: -1,
      maxTournamentsPerMonth: -1,
      platformFeePercent: 0.03,
      features: { 
        autoMatchResult: true,
        gateway: true,
        customReward: true,
        reservePlayer: true,
        autoPayout: true,
        advancedAnalytics: true
      },
      sortOrder: 3,
    }
  ];

  for (const p of plans) {
    const { earlyAccessPrice, ...rest } = p;
    await prisma.subscriptionPlanConfig.upsert({
      where: { plan: p.plan },
      update: { ...rest, ...(earlyAccessPrice !== undefined ? { earlyAccessPrice } : {}) },
      create: { ...rest, ...(earlyAccessPrice !== undefined ? { earlyAccessPrice } : {}) } as any,
    });
  }
  
  console.log('Subscription Plans seeded successfully!');
}

seedPlans().catch(console.error).finally(() => process.exit(0));
