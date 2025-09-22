import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createCanvas } from 'canvas';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure public/ and public/icons directories exist
const publicDir = new URL('../public', import.meta.url).pathname;
const iconsDir = new URL('../public/icons', import.meta.url).pathname;
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create a simple icon with text
function createIcon(size, text, bgColor = '#4f46e5', textColor = '#ffffff') {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  
  return canvas.toBuffer();
}

// Generate icons for both /icons and root-level PWA files
const sizes = [192, 512];
const texts = ['192', '512'];

sizes.forEach((size, index) => {
  const buffer = createIcon(size, texts[index]);

  // /public/icons/icon-<size>x<size>.png
  const iconPath = new URL(`../public/icons/icon-${size}x${size}.png`, import.meta.url).pathname;
  writeFileSync(iconPath, buffer);
  console.log(`Generated icons/icon-${size}x${size}.png`);

  // /public/pwa-<size>x<size>.png (root-level for manifest and PWA plugin)
  const pwaRootPath = new URL(`../public/pwa-${size}x${size}.png`, import.meta.url).pathname;
  writeFileSync(pwaRootPath, buffer);
  console.log(`Generated pwa-${size}x${size}.png`);
});

// Create favicon
const favicon = createIcon(32, 'P', '#4f46e5', '#ffffff');
const faviconPath = new URL('../public/favicon.ico', import.meta.url).pathname;
writeFileSync(faviconPath, favicon);
console.log('Generated favicon.ico');
