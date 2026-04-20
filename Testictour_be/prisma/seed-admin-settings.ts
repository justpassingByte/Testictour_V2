import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin settings...');

    // Platform Settings
    const platformSettings = [
        { key: 'maintenance_mode', value: 'false', type: 'boolean', label: 'Maintenance Mode', group: 'general' },
        { key: 'maintenance_message', value: 'We are under scheduled maintenance. We will be back soon!', type: 'string', label: 'Maintenance Message', group: 'general' },
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
        { key: 'enable_partner_rewards', enabled: true, description: 'Enable custom reward creation for partners' },
    ];

    for (const f of featureFlags) {
        await prisma.featureFlag.upsert({
            where: { key: f.key },
            update: {},
            create: f,
        });
    }
    console.log(`✓ Seeded ${featureFlags.length} feature flags`);

    // Subscription Plan Configs — 4 tiers
    const plans = [
        {
            plan: 'FREE',
            displayName: 'Free',
            description: 'Dùng thử nền tảng, không giới hạn thời gian',
            monthlyPrice: 0,
            annualPrice: 0,
            maxLobbies: 1,
            maxTournamentSize: 32,
            maxTournamentsPerMonth: 2,
            platformFeePercent: 0.05,
            sortOrder: 0,
            features: {
                basicBracket: true,
                leaderboardRealtime: true,
                manualResultEntry: true,
                autoScoring: true,
                basicRegistration: true,
                simpleCheckIn: true,
                exportBracket: true,
                customBranding: false,
                analyticsExport: false,
                prioritySupport: false,
                revenueShare: false,
                autoMatchResult: false,
                gateway: false,
                customRewards: false,
                reservePlayer: false,
                advancedAnalytics: false,
                autoRoundProgression: false,
                discordIntegration: false,
            },
        },
        {
            plan: 'STARTER',
            displayName: 'Starter',
            description: 'Bắt đầu nhanh, thay thế hoàn toàn Google Sheets',
            monthlyPrice: 19,
            annualPrice: 190,
            maxLobbies: 2,
            maxTournamentSize: 128,
            maxTournamentsPerMonth: 5,
            platformFeePercent: 0.05,
            sortOrder: 1,
            features: {
                basicBracket: true,
                leaderboardRealtime: true,
                manualResultEntry: true,
                autoScoring: true,
                basicRegistration: true,
                simpleCheckIn: true,
                exportBracket: true,
                bannerBranding: true,
                manualEscrow: true,
                autoLobbyShuffleSplit: true,
                customBranding: false,
                analyticsExport: false,
                prioritySupport: false,
                revenueShare: false,
                autoMatchResult: false,
                gateway: false,
                customRewards: false,
                reservePlayer: false,
                advancedAnalytics: false,
                autoRoundProgression: false,
                discordIntegration: false,
            },
        },
        {
            plan: 'PRO',
            displayName: 'Pro',
            description: 'Tự động hóa vận hành + giữ chân player',
            monthlyPrice: 49,
            annualPrice: 490,
            earlyAccessPrice: 39,
            maxLobbies: 5,
            maxTournamentSize: 256,
            maxTournamentsPerMonth: 10,
            platformFeePercent: 0.05,
            sortOrder: 2,
            features: {
                basicBracket: true,
                leaderboardRealtime: true,
                manualResultEntry: true,
                autoScoring: true,
                basicRegistration: true,
                simpleCheckIn: true,
                exportBracket: true,
                bannerBranding: true,
                manualEscrow: true,
                autoLobbyShuffleSplit: true,
                customBranding: true,
                analyticsExport: true,
                autoMatchResult: true,
                gateway: true,
                customRewards: true,
                reservePlayer: true,
                advancedAnalytics: true,
                autoRoundProgression: true,
                revenueShare: true,
                prioritySupport: false,
                discordIntegration: false,
            },
        },
        {
            plan: 'ENTERPRISE',
            displayName: 'Enterprise',
            description: 'Scale lớn + vận hành chuyên nghiệp',
            monthlyPrice: 99,
            annualPrice: 990,
            maxLobbies: -1, // unlimited
            maxTournamentSize: -1,
            maxTournamentsPerMonth: -1,
            platformFeePercent: 0.03,
            sortOrder: 3,
            features: {
                basicBracket: true,
                leaderboardRealtime: true,
                manualResultEntry: true,
                autoScoring: true,
                basicRegistration: true,
                simpleCheckIn: true,
                exportBracket: true,
                bannerBranding: true,
                manualEscrow: true,
                autoLobbyShuffleSplit: true,
                customBranding: true,
                analyticsExport: true,
                autoMatchResult: true,
                gateway: true,
                customRewards: true,
                reservePlayer: true,
                advancedAnalytics: true,
                autoRoundProgression: true,
                revenueShare: true,
                prioritySupport: true,
                discordIntegration: true,
                autoEscrow: true,
                autoPayout: true,
                autoRefund: true,
                customRuleConfig: true,
                earlyAccessFeatures: true,
                unlimitedTournaments: true,
            },
        },
    ];

    for (const p of plans) {
        await prisma.subscriptionPlanConfig.upsert({
            where: { plan: p.plan },
            update: {
                displayName: p.displayName,
                description: p.description,
                monthlyPrice: p.monthlyPrice,
                annualPrice: p.annualPrice,
                ...(p.earlyAccessPrice !== undefined && { earlyAccessPrice: p.earlyAccessPrice }),
                maxLobbies: p.maxLobbies,
                maxTournamentSize: p.maxTournamentSize,
                maxTournamentsPerMonth: p.maxTournamentsPerMonth,
                platformFeePercent: p.platformFeePercent,
                sortOrder: p.sortOrder,
                features: p.features,
            },
            create: {
                plan: p.plan,
                displayName: p.displayName,
                description: p.description,
                monthlyPrice: p.monthlyPrice,
                annualPrice: p.annualPrice,
                ...(p.earlyAccessPrice !== undefined && { earlyAccessPrice: p.earlyAccessPrice }),
                maxLobbies: p.maxLobbies,
                maxTournamentSize: p.maxTournamentSize,
                maxTournamentsPerMonth: p.maxTournamentsPerMonth,
                platformFeePercent: p.platformFeePercent,
                sortOrder: p.sortOrder,
                features: p.features,
            },
        });
    }
    console.log(`✓ Seeded ${plans.length} subscription plan configs (4 tiers)`);

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
