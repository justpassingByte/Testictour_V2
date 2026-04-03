import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin settings...');

    // Platform Settings
    const platformSettings = [
        { key: 'maintenance_mode', value: 'false', type: 'boolean', label: 'Maintenance Mode', group: 'general' },
        { key: 'maintenance_message', value: 'We are under scheduled maintenance. We will be back soon!', type: 'string', label: 'Maintenance Message', group: 'general' },
        { key: 'platform_fee_pct', value: '10', type: 'number', label: 'Platform Fee (%)', group: 'financial' },
        { key: 'max_lobby_players', value: '8', type: 'number', label: 'Max Players Per Lobby', group: 'limits' },
        { key: 'max_tournament_size', value: '64', type: 'number', label: 'Max Tournament Size', group: 'limits' },
    ];

    for (const s of platformSettings) {
        await prisma.platformSetting.upsert({
            where: { key: s.key },
            update: {},
            create: s,
        });
    }
    console.log(`✓ Seeded ${platformSettings.length} platform settings`);

    // Feature Flags
    const featureFlags = [
        { key: 'enable_mini_tours', enabled: true, description: 'Enable mini-tour lobby creation for partners' },
        { key: 'enable_rewards', enabled: true, description: 'Enable reward distribution after tournaments' },
        { key: 'enable_referrals', enabled: false, description: 'Enable referral code system for new registrations' },
    ];

    for (const f of featureFlags) {
        await prisma.featureFlag.upsert({
            where: { key: f.key },
            update: {},
            create: f,
        });
    }
    console.log(`✓ Seeded ${featureFlags.length} feature flags`);

    // Subscription Plan Configs
    const plans = [
        {
            plan: 'FREE',
            monthlyPrice: 0,
            annualPrice: 0,
            maxLobbies: 1,
            maxPlayersPerLobby: 8,
            maxTournamentsPerMonth: 2,
            features: { customBranding: false, analyticsExport: false, prioritySupport: false, revenueShare: false },
        },
        {
            plan: 'PRO',
            monthlyPrice: 29.99,
            annualPrice: 299.99,
            maxLobbies: 5,
            maxPlayersPerLobby: 16,
            maxTournamentsPerMonth: 15,
            features: { customBranding: true, analyticsExport: true, prioritySupport: false, revenueShare: false },
        },
        {
            plan: 'ENTERPRISE',
            monthlyPrice: 99.99,
            annualPrice: 999.99,
            maxLobbies: -1, // unlimited (-1 = no limit)
            maxPlayersPerLobby: 32,
            maxTournamentsPerMonth: -1,
            features: { customBranding: true, analyticsExport: true, prioritySupport: true, revenueShare: true },
        },
    ];

    for (const p of plans) {
        await prisma.subscriptionPlanConfig.upsert({
            where: { plan: p.plan },
            update: {},
            create: p,
        });
    }
    console.log(`✓ Seeded ${plans.length} subscription plan configs`);

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
