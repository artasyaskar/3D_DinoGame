import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcBase = join(__dirname, '../../public/assets');
const destBase = join(__dirname, '../../dist/assets');

// Function to ensure directory exists
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Function to copy file with directory creation
function copyFileWithDirs(src, dest) {
  const destDir = dirname(dest);
  ensureDir(destDir);
  
  try {
    copyFileSync(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Error copying ${src} to ${dest}:`, err.message);
  }
}

// Function to copy directory contents
function copyDirContents(src, dest) {
  if (!existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return;
  }

  ensureDir(dest);
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    try {
      const stat = statSync(srcPath);
      
      if (stat.isDirectory()) {
        copyDirContents(srcPath, destPath);
      } else if (stat.isFile()) {
        copyFileWithDirs(srcPath, destPath);
      }
    } catch (err) {
      console.error(`Error processing ${srcPath}:`, err.message);
    }
  }
}

console.log('Starting asset copy...');
try {
  copyDirContents(srcBase, destBase);
  console.log('Asset copy completed successfully!');
} catch (err) {
  console.error('Error during asset copy:', err);
  process.exit(1);
}
