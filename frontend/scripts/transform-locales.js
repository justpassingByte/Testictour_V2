const fs = require('fs');
const path = require('path');

// Function to transform flat structure with dots to nested objects
function transformMessages(input) {
  const output = {};
  
  Object.entries(input).forEach(([key, value]) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = output;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    } else {
      output[key] = value;
    }
  });
  
  return output;
}

// Process all locale files
const localesDir = path.join(__dirname, '../locales');
const locales = fs.readdirSync(localesDir);

locales.forEach(locale => {
  const localePath = path.join(localesDir, locale);
  
  if (fs.statSync(localePath).isDirectory()) {
    const commonFilePath = path.join(localePath, 'common.json');
    
    if (fs.existsSync(commonFilePath)) {
      try {
        const content = fs.readFileSync(commonFilePath, 'utf8');
        const messages = JSON.parse(content);
        
        // Transform the messages
        const transformedMessages = transformMessages(messages);
        
        // Write back the transformed messages
        fs.writeFileSync(
          commonFilePath, 
          JSON.stringify(transformedMessages, null, 2),
          'utf8'
        );
        
        console.log(`✅ Successfully transformed ${locale}/common.json`);
      } catch (error) {
        console.error(`❌ Error processing ${locale}/common.json:`, error);
      }
    }
  }
});

console.log('✅ All locale files transformed successfully!'); 