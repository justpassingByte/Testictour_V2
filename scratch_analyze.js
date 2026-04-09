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
  } catch(e) {}
  return results;
}

const frontendPath = path.resolve(__dirname, 'frontend');
const files = findFiles(path.join(frontendPath, 'app'), ['.tsx']).concat(findFiles(path.join(frontendPath, 'components'), ['.tsx']));

const jsxTextRegex = />\s*([A-Z][a-zA-Z0-9\s,\.!?'"()]{2,})\s*<\//g;
let fileScores = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  let match;
  let matches = [];
  while ((match = jsxTextRegex.exec(content)) !== null) {
    if(!match[1].startsWith('{') && !match[1].includes('{') && /^[A-Z]/.test(match[1])) {
       matches.push(match[1]);
    }
  }
  if (matches.length > 0) {
    fileScores.push({ file: f.replace(frontendPath, ''), count: matches.length, lines: matches.slice(0, 3) });
  }
});

fileScores.sort((a, b) => b.count - a.count);
console.log(JSON.stringify(fileScores.slice(0, 20), null, 2));
