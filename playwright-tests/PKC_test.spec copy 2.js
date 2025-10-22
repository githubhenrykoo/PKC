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

  // 3. Upload file via API
  const filePath = path.resolve(__dirname, '../Docs/API/Mcard-user-manual.md');
  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new File([fileContent], 'Mcard-user-manual.md', { type: 'text/markdown' }));
  
  await fetch('http://localhost:49384/v1/files', {
    method: 'POST',
    body: formData
  });
  await new Promise(r => setTimeout(r, 3000));

  // 4. Search and select item
  await page.fill('#search-input', 'MCard');
  await new Promise(r => setTimeout(r, 2000));
  await page.click('#nav-items button.nav-link:first-child');
  await new Promise(r => setTimeout(r, 5000));

  // 5. Convert to PDF
  await page.click('#convert-button');
  console.log('PDF conversion started');
  await new Promise(r => setTimeout(r, 10000));
  
  // 6. Clear search
  await page.click('#search-clear');
  await new Promise(r => setTimeout(r, 1000));

  // 7. RAG Intelligence
  await page.click('#ai-chat-btn');
  await new Promise(r => setTimeout(r, 2000));

  // 8. Retrieve from MCard
  await page.click('button:has-text("Retrieve from MCard")');
  await new Promise(r => setTimeout(r, 4000));

  // 9. Index Documents
  await page.click('button:has-text("Index Documents")');
  await new Promise(r => setTimeout(r, 4000));

  // 10. Notion integration
  await page.click('#notion-btn');
  await new Promise(r => setTimeout(r, 5000));
  
  // 11. Connect to Notion
  await page.click('button.connect-button:has-text("Connect to Notion")');
  await new Promise(r => setTimeout(r, 2000));
  
  // 12. Select pages
  await page.click('div[role="button"]:has-text("Select pages")');
  await new Promise(r => setTimeout(r, 2000));
  
  // 13. Allow access
  await page.click('div[role="button"]:has-text("Allow access")');
  await new Promise(r => setTimeout(r, 2000));
  
  // 14. Google Calendar
  await page.click('#google-calendar-btn');
  await new Promise(r => setTimeout(r, 4000));
  
  // 15. Google Sign In
  await page.click('button:has-text("Sign in with Google")');
  await new Promise(r => setTimeout(r, 4000));
  
  // 16. Select account
  await page.click('div[data-email="alessandrorumampuk@gmail.com"]');
  await new Promise(r => setTimeout(r, 4000));
  
  // 17-19. Handle security warnings
  await page.click('a:has-text("Advanced")');
  await new Promise(r => setTimeout(r, 2000));
  await page.click('a:has-text("Go to MCP Testing (unsafe)")');
  await new Promise(r => setTimeout(r, 2000));
  await page.click('button:has-text("Continue")');
  await new Promise(r => setTimeout(r, 2000));
});
