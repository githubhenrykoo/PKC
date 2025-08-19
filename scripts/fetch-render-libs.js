#!/usr/bin/env node
/*
  Fetch rendering libraries (Marked, DOMPurify, KaTeX) into public/vendor for local/offline use.
  Files downloaded:
    - public/vendor/marked/marked.min.js
    - public/vendor/dompurify/purify.min.js
    - public/vendor/katex/katex.min.js
    - public/vendor/katex/auto-render.min.js
    - public/vendor/katex/katex.min.css

  Note: KaTeX fonts are not included in this initial script. The app falls back to CDN for CSS/fonts if local CSS fails to load.
*/

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const publicDir = path.resolve(root, '..', 'public');
const vendorDir = path.join(publicDir, 'vendor');

const VERSION = {
  marked: '12.0.2',
  dompurify: '3.1.6',
  katex: '0.16.9'
};

const files = [
  {
    url: `https://cdn.jsdelivr.net/npm/marked@${VERSION.marked}/marked.min.js`,
    dst: path.join(vendorDir, 'marked', 'marked.min.js')
  },
  {
    url: `https://cdn.jsdelivr.net/npm/dompurify@${VERSION.dompurify}/dist/purify.min.js`,
    dst: path.join(vendorDir, 'dompurify', 'purify.min.js')
  },
  {
    url: `https://cdn.jsdelivr.net/npm/katex@${VERSION.katex}/dist/katex.min.js`,
    dst: path.join(vendorDir, 'katex', 'katex.min.js')
  },
  {
    url: `https://cdn.jsdelivr.net/npm/katex@${VERSION.katex}/dist/contrib/auto-render.min.js`,
    dst: path.join(vendorDir, 'katex', 'auto-render.min.js')
  },
  {
    url: `https://cdn.jsdelivr.net/npm/katex@${VERSION.katex}/dist/katex.min.css`,
    dst: path.join(vendorDir, 'katex', 'katex.min.css')
  }
];

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dst) {
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(dst));
    const file = fs.createWriteStream(dst);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Redirect
          https.get(res.headers.location, (res2) => {
            if (res2.statusCode !== 200) {
              reject(new Error(`Failed to download ${url}. Status: ${res2.statusCode}`));
              return;
            }
            res2.pipe(file);
            file.on('finish', () => file.close(resolve));
          }).on('error', reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}. Status: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        fs.unlink(dst, () => reject(err));
      });
  });
}

(async () => {
  try {
    console.log('Fetching render libraries into public/vendor ...');
    for (const f of files) {
      const rel = path.relative(publicDir, f.dst);
      process.stdout.write(`- ${rel} ... `);
      await download(f.url, f.dst);
      console.log('done');
    }

    // After downloading katex.min.css, parse it to fetch fonts referenced within.
    const katexCssPath = path.join(vendorDir, 'katex', 'katex.min.css');
    if (fs.existsSync(katexCssPath)) {
      const css = fs.readFileSync(katexCssPath, 'utf8');
      const urlRegex = /url\(([^)]+)\)/g; // matches url("fonts/..") or url(fonts/...)
      const found = new Set();
      let match;
      while ((match = urlRegex.exec(css)) !== null) {
        let u = match[1].trim().replace(/['"]/g, '');
        if (u.startsWith('data:')) continue; // skip data URIs
        // Only handle fonts path
        if (!u.startsWith('fonts/')) continue;
        found.add(u);
      }
      if (found.size > 0) {
        console.log(`Fetching KaTeX fonts (${found.size}) ...`);
        for (const relUrl of found) {
          const srcUrl = `https://cdn.jsdelivr.net/npm/katex@${VERSION.katex}/dist/${relUrl}`;
          const dstPath = path.join(vendorDir, 'katex', relUrl);
          const relOut = path.relative(publicDir, dstPath);
          process.stdout.write(`- ${relOut} ... `);
          await download(srcUrl, dstPath);
          console.log('done');
        }
      } else {
        console.log('No font URLs found in katex.min.css (unexpected).');
      }
    } else {
      console.warn('katex.min.css not found; skipping font fetch.');
    }

    console.log('All files (including KaTeX fonts) fetched successfully.');
  } catch (err) {
    console.error('Failed to fetch vendor files:', err.message);
    process.exit(1);
  }
})();
