import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('MCard website flow test', async ({ page }) => {
  // Set test timeout to 5 minutes (300000ms)
  test.setTimeout(300000);

  // 1. Open the URL
  await page.goto('http://localhost:4321');
  await page.waitForTimeout(2000);

  // 2. Click Push to Start button
  await page.locator('#pushButton').click();
  await page.waitForTimeout(10000);

  // 7. RAG Intelligence
  await page.locator('#ai-chat-btn').click();
  await page.waitForTimeout(2000);

  // 8. Retrieve from MCard
  await page.locator('button:has-text("Retrieve from MCard")').click();
  await page.waitForTimeout(5000);

  // 9. Index Documents - wait for the button to be visible and not disabled
  const indexButton = page.getByRole('button', { name: 'Index Documents' });
  await expect(indexButton).toBeEnabled({ timeout: 300000 });
  await indexButton.click();

  // 10. Ask question about MCard
  await page.fill('input[placeholder="Ask a question about your documents..."]', 'What is MCard?');
  await new Promise(r => setTimeout(r, 120000));

  // 11. Click Send button
  await page.click('button[type="submit"]:has-text("Send")');
  await new Promise(r => setTimeout(r, 2000));

  // 12. Wait 2 minutes and take screenshots
  await new Promise(r => setTimeout(r, 120000));

  // Take screenshots
  await page.screenshot({ path: path.join(__dirname, 'rag-test-final.png'), fullPage: true });
  console.log('Screenshot saved: rag-test-final.png');
});
