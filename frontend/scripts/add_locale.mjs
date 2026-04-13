import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const params = {};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : true;
    params[key] = value;
    if (value !== true) i++;
  }
}

async function translateText(text, targetLang = 'vi', sourceLang = 'en') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(item => item[0]).join('');
  } catch (error) {
    console.error('❌ Auto-translation failed:', error);
    return null;
  }
}

async function main() {
  if (!params.key || typeof params.en !== 'string') {
    console.log(`
Usage (Safe i18n adder): 
node scripts/add_locale.mjs --key my_key --en "English" [--vi "Vietnamese"] [--file path/to/file.tsx] [--search "exact_string"] [--replace "replacement_code"]

Examples:
1. Auto translate English to Vietnamese:
   node scripts/add_locale.mjs --key winner --en Winner

2. Manual translation:
   node scripts/add_locale.mjs --key winner --en Winner --vi "Người thắng"

3. Update JSON and safely replace in a TSX file:
   node scripts/add_locale.mjs \\
      --key round \\
      --en Round \\
      --file app/[locale]/tournaments/[id]/components/TournamentRecentResultsTab.tsx \\
      --search ">Round " \\
      --replace ">{t('round')} "
    `);
    process.exit(1);
  }

  // Auto-translate if --vi is not provided
  if (!params.vi || typeof params.vi !== 'string') {
    console.log(`⏳ Auto-translating "${params.en}" to Vietnamese...`);
    const translated = await translateText(params.en);
    if (!translated) {
      console.error('Please provide --vi manually since translation failed.');
      process.exit(1);
    }
    params.vi = translated;
    console.log(`✨ Translated to: "${params.vi}"`);
  }

  // 1. Update locales
  const updateJSON = (locale, text) => {
    const jsonPath = path.resolve(__dirname, `../locales/${locale}/common.json`);
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ File not found: ${jsonPath}`);
      return;
    }
    
    let data;
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.error(`❌ Error parsing JSON in ${jsonPath}`);
      process.exit(1);
    }
    
    if (data[params.key]) {
        console.log(`⚠️ Key "${params.key}" already exists in ${locale}/common.json. Overwriting...`);
    }

    data[params.key] = text;
    
    // Sort keys
    const sortedData = Object.keys(data).sort().reduce((acc, k) => {
      acc[k] = data[k];
      return acc;
    }, {});
    
    fs.writeFileSync(jsonPath, JSON.stringify(sortedData, null, 2) + '\n');
    console.log(`✅ Added to ${locale}/common.json -> "${params.key}": "${text}"`);
  };

  updateJSON('en', params.en);
  updateJSON('vi', params.vi);

  // 2. Perform safe replacement if requested
  if (params.file && params.search && params.replace) {
    const targetPath = path.resolve(__dirname, '..', params.file);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Target file not found: ${targetPath}`);
      process.exit(1);
    }
    
    let content = fs.readFileSync(targetPath, 'utf8');
    
    if (!content.includes(params.search)) {
        console.log(`\\n⚠️ Search string not found in ${params.file}. Content was not modified.`);
        console.log(`Searched for EXACTLY: ${params.search}`);
    } else {
        const oldContent = content;
        // split.join is a safe replaceAll
        content = content.split(params.search).join(params.replace);
        
        if (content !== oldContent) {
           fs.writeFileSync(targetPath, content);
           console.log(`\\n✅ Safely executed string substitution in ${params.file}`);
        }
    }
  }
}

main();
