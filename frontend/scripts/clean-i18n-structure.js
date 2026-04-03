#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const APP_DIR = path.join(__dirname, '..', 'app');
const LOCALES = ['en', 'vi', 'ko', 'zh'];

console.log('Cleaning i18n directory structure...');

// Helper function to check if a path is a directory
function isDirectory(source) {
  return fs.existsSync(source) && fs.lstatSync(source).isDirectory();
}

// Check for nested locale directories (e.g., /en/en/)
LOCALES.forEach(locale => {
  const localeDir = path.join(APP_DIR, locale);
  
  if (isDirectory(localeDir)) {
    LOCALES.forEach(nestedLocale => {
      const nestedLocaleDir = path.join(localeDir, nestedLocale);
      
      if (isDirectory(nestedLocaleDir)) {
        console.log(`Found nested locale directory: ${nestedLocaleDir}`);
        console.log(`This should be fixed manually to avoid data loss.`);
      }
    });
  }
});

// Check for duplicate pages in both root and locale directories
function getFiles(source) {
  if (!fs.existsSync(source)) return [];
  
  return fs.readdirSync(source)
    .filter(file => !isDirectory(path.join(source, file)))
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
}

function getDirectories(source) {
  if (!fs.existsSync(source)) return [];
  
  return fs.readdirSync(source)
    .map(name => path.join(source, name))
    .filter(isDirectory);
}

function findDuplicateFiles(rootDir, localeDir, relativePath = '') {
  const rootPath = path.join(rootDir, relativePath);
  const localePath = path.join(localeDir, relativePath);
  
  if (!fs.existsSync(rootPath) || !fs.existsSync(localePath)) {
    return;
  }
  
  // Check files
  const rootFiles = getFiles(rootPath);
  const localeFiles = getFiles(localePath);
  
  rootFiles.forEach(file => {
    if (localeFiles.includes(file)) {
      console.log(`Duplicate file found:`);
      console.log(`  - ${path.join(rootPath, file)}`);
      console.log(`  - ${path.join(localePath, file)}`);
    }
  });
  
  // Check subdirectories
  const rootDirs = getDirectories(rootPath)
    .map(dir => path.relative(rootDir, dir));
  
  rootDirs.forEach(dir => {
    findDuplicateFiles(rootDir, localeDir, dir);
  });
}

// Find duplicates between root app directory and locale directories
LOCALES.forEach(locale => {
  const localeDir = path.join(APP_DIR, locale);
  
  if (isDirectory(localeDir)) {
    console.log(`\nChecking for duplicates between app/ and app/${locale}/...`);
    findDuplicateFiles(APP_DIR, localeDir);
  }
});

// Check if [locale] directory has the correct structure
const localeTemplateDir = path.join(APP_DIR, '[locale]');
if (isDirectory(localeTemplateDir)) {
  console.log('\nChecking [locale] directory structure...');
  
  // Check if layout.tsx exists
  const layoutFile = path.join(localeTemplateDir, 'layout.tsx');
  if (!fs.existsSync(layoutFile)) {
    console.log(`WARNING: Missing layout.tsx in [locale] directory.`);
    console.log(`This file is required for the i18n setup to work properly.`);
  } else {
    console.log(`✓ [locale]/layout.tsx exists`);
  }
  
  // Check if page.tsx exists
  const pageFile = path.join(localeTemplateDir, 'page.tsx');
  if (!fs.existsSync(pageFile)) {
    console.log(`WARNING: Missing page.tsx in [locale] directory.`);
  } else {
    console.log(`✓ [locale]/page.tsx exists`);
  }
}

console.log('\nCleanup suggestions:');
console.log('1. Remove duplicate files (keep the ones in locale directories)');
console.log('2. Make sure all page components use translations');
console.log('3. Update imports to use relative paths correctly');
console.log('4. Test your application with different locales'); 