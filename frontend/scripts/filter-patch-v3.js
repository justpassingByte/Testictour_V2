const fs = require('fs');

let rawPatch = fs.readFileSync('all.patch', 'utf16le');
if (rawPatch.charCodeAt(0) === 0xFEFF) {
  rawPatch = rawPatch.slice(1);
}

const chunks = rawPatch.split(/^diff --git /m);
let cleanPatch = '';
let droppedHunksCount = 0;

for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lines = chunk.split(/\r?\n/);
    const headerLines = [];
    let lIndex = 0;
    
    while (lIndex < lines.length && !lines[lIndex].startsWith('@@')) {
        headerLines.push(lines[lIndex]);
        lIndex++;
    }
    
    const headerStr = headerLines[0] || '';
    const match = headerStr.trim().match(/^a\/(.*?)\s+b\/(.*?)$/);
    const fileName = match ? match[2] : '';
    
    const isFrontendComponent = fileName.includes('app/[locale]/') && fileName.endsWith('.tsx');
    const isManuallyTranslated = fileName.includes('LobbyActionCard.tsx') || fileName.includes('LobbyMatchesTab.tsx') || fileName.includes('match-details-inline.tsx') || fileName.includes('match-details-modal.tsx');
    
    if (!isFrontendComponent) {
        cleanPatch += 'diff --git ' + chunk;
        if (!chunk.endsWith('\n')) cleanPatch += '\n';
        continue;
    }
    
    const cleanHunks = [];
    let currentHunk = [];
    
    while (lIndex < lines.length) {
        const line = lines[lIndex];
        if (line.startsWith('@@')) {
            if (currentHunk.length > 0) {
                cleanHunks.push(currentHunk);
            }
            currentHunk = [line];
        } else {
            currentHunk.push(line);
        }
        lIndex++;
    }
    if (currentHunk.length > 0) {
        cleanHunks.push(currentHunk);
    }
    
    const validHunks = [];
    for (const hunk of cleanHunks) {
        const text = hunk.join('\n');
        
        // Characteristic corruptions from my i18n script AND from powershell fixes
        const hasTInjection = text.includes('{t("') || text.includes('const t = useTranslations');
        const hasPowerShellRewrite = text.includes('useState<') && !text.includes('= useState<') && !text.includes('React.useState');
        // Actually, let's keep it simple: drop ALL hunks that added `{t("` or `useTranslations` OR modified `useState` with a missing assignment.
        // What if the PowerShell script ALREADY removed `{t("`?
        // In the all.patch, we are comparing HEAD with current working directory.
        // Current working directory has `useState<string | null><string>` instead of `useState<string | null>({t...})`.
        // So the patch hunk WILL show removals of `useState<string | null>(initial_val)` and additions of `useState<string | null><string>`.
        // So we can drop hunks that contain additions (+... ) of invalid markup!
        let dropped = false;

        const addedLines = hunk.filter(l => l.startsWith('+') && !l.startsWith('+++'));
        for (const added of addedLines) {
            if (added.includes('{t("')) dropped = true;
            if (added.includes('const t = useTranslations')) dropped = true;
            if (added.match(/useState<[^>]+></)) dropped = true; // e.g. useState<...><...>
        }
        
        if (dropped && !isManuallyTranslated) {
            droppedHunksCount++;
            console.log('Dropping hunk in', fileName);
        } else {
            validHunks.push(hunk);
        }
    }
    
    if (validHunks.length > 0) {
        cleanPatch += 'diff --git ' + headerLines.join('\n') + '\n';
        for (const hunk of validHunks) {
            cleanPatch += hunk.join('\n') + '\n';
        }
    }
}

fs.writeFileSync('clean_v3.patch', cleanPatch, 'utf8');
console.log('Saved clean_v3.patch. Dropped ' + droppedHunksCount + ' hunks.');
