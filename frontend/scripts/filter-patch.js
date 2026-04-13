const fs = require('fs');

const rawPatch = fs.readFileSync('all.patch', 'utf8');

// Parse the patch file
const filePatches = rawPatch.split(/^diff --git /m).filter(Boolean);

let cleanPatch = '';

for (const fp of filePatches) {
    const lines = fp.split('\n');
    const headerLines = [];
    let i = 0;
    while (i < lines.length && !lines[i].startsWith('@@')) {
        headerLines.push(lines[i]);
        i++;
    }
    
    const fileNameMatch = headerLines[0] && headerLines[0].match(/b\/(.*)/);
    const fileName = fileNameMatch ? fileNameMatch[1] : '';

    const isFrontendComponent = fileName.includes('app/[locale]/') && fileName.endsWith('.tsx');
    const isManuallyTranslated = fileName.includes('LobbyActionCard.tsx') || fileName.includes('LobbyMatchesTab.tsx') || fileName.includes('match-details-inline.tsx') || fileName.includes('match-details-modal.tsx');

    // If it's not a frontend component, we keep all of it (e.g., config, backend changes)
    if (!isFrontendComponent) {
        cleanPatch += 'diff --git ' + fp;
        continue;
    }

    // Process hunks
    const hunks = [];
    let currentHunk = [];
    while (i < lines.length) {
        if (lines[i].startsWith('@@')) {
            if (currentHunk.length > 0) {
                hunks.push(currentHunk);
            }
            currentHunk = [lines[i]];
        } else {
            currentHunk.push(lines[i]);
        }
        i++;
    }
    if (currentHunk.length > 0) {
        hunks.push(currentHunk);
    }

    const cleanHunks = [];
    for (const hunk of hunks) {
        const hunkText = hunk.join('\n');
        
        // Characteristic signs of the corruption or the PowerShell fix attempt
        const hasTInjection = hunkText.includes('{t("') || hunkText.includes("useTranslations");
        
        if (hasTInjection && !isManuallyTranslated) {
            // Drop this hunk to revert to pristine state
            console.log(`Dropped hunk in ${fileName}`);
        } else {
            cleanHunks.push(hunk);
        }
    }

    if (cleanHunks.length > 0) {
        cleanPatch += 'diff --git ' + headerLines.join('\n') + '\n';
        for (const hunk of cleanHunks) {
            cleanPatch += hunk.join('\n') + '\n';
        }
    }
}

fs.writeFileSync('clean.patch', cleanPatch, 'utf8');
console.log('Saved clean.patch');
