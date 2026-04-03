#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const APP_DIR = path.join(__dirname, '..', 'app');
const LOCALES = ['en', 'vi', 'ko', 'zh'];
const DEFAULT_LOCALE = 'en';

// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Helper function to check if a path is a directory
function isDirectory(source) {
  return fs.lstatSync(source).isDirectory();
}

// Helper function to get directories in a path
function getDirectories(source) {
  return fs.readdirSync(source)
    .map(name => path.join(source, name))
    .filter(isDirectory);
}

// Helper function to get files in a path
function getFiles(source) {
  return fs.readdirSync(source)
    .filter(file => !isDirectory(path.join(source, file)))
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
}

// Check if locale directories already exist and warn user
let existingLocales = [];
LOCALES.forEach(locale => {
  const localeDir = path.join(APP_DIR, locale);
  if (fs.existsSync(localeDir)) {
    existingLocales.push(locale);
  }
});

if (existingLocales.length > 0) {
  console.log(`WARNING: The following locale directories already exist: ${existingLocales.join(', ')}`);
  console.log('This may cause duplicate files. Do you want to continue? (y/n)');
  
  // Since we can't get user input in this environment, we'll just warn and continue
  console.log('Continuing with migration but will skip existing files...');
}

// Create locale directories if they don't exist
LOCALES.forEach(locale => {
  const localeDir = path.join(APP_DIR, locale);
  ensureDirectoryExists(localeDir);
});

// Process a page file
function processPageFile(filePath, relativePath) {
  // Skip if the file is in a locale directory already
  if (LOCALES.some(locale => filePath.includes(`/${locale}/`))) {
    return;
  }
  
  // Skip if the file is in the [locale] directory
  if (filePath.includes('/[locale]/')) {
    return;
  }

  // Skip special files and directories
  if (
    filePath.includes('/api/') ||
    filePath.includes('/components/') ||
    filePath.includes('/lib/') ||
    filePath.includes('/locales/') ||
    filePath.includes('/stores/') ||
    filePath.includes('/services/') ||
    filePath.includes('/types/') ||
    filePath.includes('/config.ts') ||
    filePath.includes('/globals.css') ||
    filePath.includes('/layout.tsx')
  ) {
    return;
  }

  console.log(`Processing: ${filePath}`);

  // Read the file content
  const content = fs.readFileSync(filePath, 'utf8');

  // Create the file in each locale directory
  LOCALES.forEach(locale => {
    const destDir = path.join(APP_DIR, locale, relativePath);
    const destFile = path.join(destDir, path.basename(filePath));
    
    ensureDirectoryExists(destDir);
    
    if (!fs.existsSync(destFile)) {
      fs.writeFileSync(destFile, content);
      console.log(`Created: ${destFile}`);
    } else {
      console.log(`Skipped existing file: ${destFile}`);
    }
  });
}

// Process a directory recursively
function processDirectory(dirPath, baseDir = APP_DIR) {
  const relativePath = path.relative(baseDir, dirPath);
  
  // Skip locale directories
  if (LOCALES.some(locale => dirPath === path.join(APP_DIR, locale))) {
    return;
  }
  
  // Skip [locale] directory
  if (dirPath === path.join(APP_DIR, '[locale]')) {
    return;
  }
  
  // Process files in this directory
  getFiles(dirPath).forEach(file => {
    processPageFile(path.join(dirPath, file), relativePath);
  });
  
  // Process subdirectories
  getDirectories(dirPath).forEach(subDir => {
    processDirectory(subDir, baseDir);
  });
}

// Start processing from the app directory
console.log('Starting migration to i18n structure...');
processDirectory(APP_DIR);
console.log('Migration complete!');

console.log('\nNEXT STEPS:');
console.log('1. Update imports in your files to use relative paths correctly');
console.log('2. Update your page components to use translations');
console.log('3. Remove the original files that have been migrated to locale directories');
console.log('4. Test your application with different locales'); 