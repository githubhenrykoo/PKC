import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('MCard website flow test', async ({ page }) => {
  // 1. Open the URL
  await page.goto('http://localhost:4321');
  await new Promise(r => setTimeout(r, 2000));

  // 2. Click Push to Start button
  await page.click('#pushButton');
  await new Promise(r => setTimeout(r, 10000));

  // 3. Upload file via API (Node.js compatible approach)
  const filePath = path.resolve(__dirname, '../Docs/API/Mcard-user-manual.md');
  const fileContent = fs.readFileSync(filePath);
  
  // For Node.js environment, create multipart form data manually
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 9);
  
  // Create multipart form data
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="Mcard-user-manual.md"`,
    `Content-Type: text/markdown`,
    '',
    fileContent.toString(),
    `--${boundary}--`,
    ''
  ].join('\r\n');
  
  await fetch('http://localhost:49384/v1/files', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
  });
  await new Promise(r => setTimeout(r, 3000));

  // 4. Search and select item
  await page.fill('#search-input', 'MCard');
  await new Promise(r => setTimeout(r, 2000));
  await page.click('#nav-items button.nav-link:first-child');
  await new Promise(r => setTimeout(r, 5000));

  // 5. Convert to PDF
  try {
    console.log('Starting PDF conversion...');
    await page.click('#convert-button');
    console.log('PDF conversion started, waiting for completion...');
    
    // Wait for conversion to complete - adjust selector based on your app's behavior
    await page.waitForSelector('#convert-button:not([disabled])', { 
      state: 'visible',
      timeout: 60000 // 60 seconds for PDF conversion
    });
    console.log('PDF conversion completed');
    
    // 6. Clear search with better error handling
    console.log('Attempting to clear search...');
    const clearButton = page.locator('#search-clear').first();
    await clearButton.waitFor({ state: 'visible', timeout: 10000 });
    await clearButton.click();
    console.log('Search cleared successfully');
    
    // Verify search is cleared
    await page.waitForFunction(
      () => document.querySelector('#search-input').value === '',
      null,
      { timeout: 5000 }
    );
  } catch (error) {
    console.error('Error during PDF conversion or search clear:', error);
    await page.screenshot({ path: 'test-failure.png', fullPage: true });
    throw error; // Re-throw to fail the test
  }
});