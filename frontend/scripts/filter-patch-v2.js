const fs = require('fs');

let rawPatch;
try {
  rawPatch = fs.readFileSync('all.patch', 'utf16le');
} catch (e) {
  rawPatch = fs.readFileSync('all.patch', 'utf8');
}

// ensure rawPatch isn't wrapped in BOMs if read as utf8 fallback
if (rawPatch.charCodeAt(0) === 0xFEFF) {
  rawPatch = rawPatch.slice(1);
}

// Split the patch file by 'diff --git '
const chunks = rawPatch.split(/^diff --git /m);
let cleanPatch = '';

for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lines = chunk.split('\n');
    const headerLines = [];
    let lIndex = 0;
    
    while (lIndex < lines.length && !lines[lIndex].startsWith('@@')) {
        headerLines.push(lines[lIndex]);
        lIndex++;
    }
    
    // Extract filename from the first header line (e.g. "a/path/to/file b/path/to/file")
    const match = headerLines[0] && headerLines[0].match(/^a\/(.*?)\s+b\/(.*?)$/);
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
        // i18n corruptions
        const hasTInjection = text.includes('{t("') || text.includes('const t = useTranslations("Common");') || text.includes('const t = useTranslations("common")');
        
        // Let's also check if it's purely a powershell rewrite corruption "useState<"
        const hasPowerShellRewrite = text.includes('useState<string'); 
        
        if (hasTInjection && !isManuallyTranslated) {
            console.log('Dropping i18n hunk in', fileName);
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

fs.writeFileSync('clean.patch', cleanPatch, 'utf8');
console.log('Saved clean.patch');
