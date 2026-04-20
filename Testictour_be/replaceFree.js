const fs = require('fs');

const files = [
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/locales/en/common.json',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/app/[locale]/pricing/page.tsx',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/app/[locale]/dashboard/admin/components/PartnerSubscriptionTab.tsx',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/app/[locale]/dashboard/partner/page.tsx',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/app/[locale]/dashboard/admin/components/AdminPartnerSubscriptionTab.tsx',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/frontend/app/[locale]/dashboard/partner/components/SubscriptionTab.tsx',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/sockets/notifications.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/services/TournamentService.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/services/FeeCalculationService.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/partner.controller.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/TournamentController.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/WalletController.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/miniTourLobby.controller.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/EscrowController.ts',
  'C:/Users/Admin/Desktop/projects/TesTicTour_V2/Testictour_be/src/controllers/admin.controller.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/'FREE'/g, "'STARTER'");
    content = content.replace(/plan: 'FREE'/g, "plan: 'STARTER'");
    content = content.replace(/plan === 'FREE'/g, "plan === 'STARTER'");
    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
  } else {
    console.log('Not found ' + file);
  }
}
