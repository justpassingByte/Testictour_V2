const cp = require('child_process');
const status = cp.execSync('git status --short').toString();
const lines = status.split(/\r?\n/).filter(line => line.startsWith(' M '));

const excludeFiles = [
  'app/[locale]/dashboard/admin/components/SettingsTab.tsx',
  'app/[locale]/dashboard/admin/layout.tsx',
  'app/[locale]/tournaments/[id]/page.tsx',
  'app/[locale]/tournaments/[id]/register/page.tsx',
  'app/types/tournament.ts',
  'locales/en/common.json',
  'locales/vi/common.json'
];

let filesToCheckout = [];
for (const line of lines) {
    const file = line.substring(3).trim();
    if (!excludeFiles.includes(file)) {
        filesToCheckout.push(file);
    }
}

if (filesToCheckout.length > 0) {
    for (const file of filesToCheckout) {
        cp.execSync('git checkout HEAD -- "' + file + '"');
    }
    console.log('Checked out ' + filesToCheckout.length + ' files.');
} else {
    console.log('No files to checkout.');
}
