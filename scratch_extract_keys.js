const fs = require('fs');
const path = require('path');

function findFiles(dir, extList) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, extList));
      } else {
        if (extList.some(ext => file.endsWith(ext))) {
          results.push(filePath);
        }
      }
    });
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(err);
  }
  return results;
}

const frontendPath = path.resolve(__dirname, 'frontend');
const files = findFiles(path.join(frontendPath, 'app'), ['.tsx', '.ts']).concat(findFiles(path.join(frontendPath, 'components'), ['.tsx', '.ts']));

const tRegex = /\bt\(\s*['"]([^'"]+)['"]\s*\)/g;
const keys = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }
});

const enFile = JSON.parse(fs.readFileSync(path.join(frontendPath, 'locales', 'en', 'common.json'), 'utf-8'));
const viFile = JSON.parse(fs.readFileSync(path.join(frontendPath, 'locales', 'vi', 'common.json'), 'utf-8'));

function extractKeys(obj, prefix = '') {
  let result = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result = result.concat(extractKeys(obj[key], prefix + key + '.'));
    } else {
      result.push(prefix + key);
    }
  }
  return result;
}

const enKeys = new Set(extractKeys(enFile));
const viKeys = new Set(extractKeys(viFile));

const missingInEn = [...keys].filter(k => !enKeys.has(k));
const missingInVi = [...keys].filter(k => !viKeys.has(k));

console.log('Missing in EN:', JSON.stringify(missingInEn, null, 2));
console.log('Missing in VI:', JSON.stringify(missingInVi, null, 2));
console.log('Used Keys:', keys.size);
