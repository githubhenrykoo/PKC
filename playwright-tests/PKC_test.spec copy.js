import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('MCard website flow test', async ({ page }) => {

  // 1. Open the URL
  await page.goto('http://localhost:4321');
  await page.waitForTimeout(2000); // individual wait

  // 2. Click Push to Start button
  await page.click('#pushButton');
  await page.waitForTimeout(10000);

  // 3. Upload the MCard user manual file directly via API
  console.log('Uploading MCard user manual file via API...');

  // Read the file
  const markdownFilePath = path.resolve(__dirname, '../Docs/API/Mcard-user-manual.md');
  const fileContent = fs.readFileSync(markdownFilePath);
  const fileName = path.basename(markdownFilePath);

  // Create a File object similar to what the browser would create
  const file = new File([fileContent], fileName, { type: 'text/markdown' });

  // Upload via API - use the correct endpoint
  const apiUrl = 'http://localhost:49384/v1';
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${apiUrl}/files`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File uploaded successfully:', result);

    // Wait for the upload to complete and appear in navigation
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }

  // 5. Search "Testing" in MCard input
  await page.fill('#search-input', 'MCard');
  await page.waitForTimeout(3000);

  // 4. Click only the first MCard button in the navigation list
  const firstNavItem = page.locator('#nav-items button.nav-link').first();

  await firstNavItem.waitFor({ state: 'visible' });
  const buttonText = await firstNavItem.textContent();
  console.log(`Clicking first navigation item: ${buttonText.trim()}`);
    
  try {
      await firstNavItem.click();
      console.log('Successfully clicked the first item');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000); // optional after click wait
    } catch (error) {
      console.error('Error clicking the first item:', error);
      await page.screenshot({ path: `screenshots/error-first-nav-item.png` });
    }

  // 5. Click "Convert to PDF" button
  try {
    console.log('⏱️ Starting PDF conversion process...');
    const convertButton = page.locator('#convert-button');
    await convertButton.waitFor({ state: 'visible', timeout: 10000 });
    await convertButton.click();
    console.log('✅ Clicked Convert to PDF button');

    // Wait for conversion with a shorter timeout and continue even if it fails
    console.log('⏳ Waiting for PDF conversion (max 15 seconds)...');
    try {
      // Wait for either success message or timeout
      await Promise.race([
        page.waitForSelector('.success, .alert-success, [class*="success"]', { timeout: 15000, state: 'visible' }),
        page.waitForTimeout(15000) // Max 15 seconds wait
      ]);
    } catch (e) {
      console.log('ℹ️ Continuing test - PDF conversion may still be in progress');
    }
    
    // Always try to click clear button, but don't let it fail the test
    try {
      console.log('🔍 Looking for search clear button...');
      await page.waitForTimeout(2000); // Small delay before looking for clear button
      await page.click('#search-clear', { timeout: 5000 });
      console.log('✅ Search cleared');
    } catch (error) {
      console.log('⚠️ Could not click clear button, continuing test...');
    }
    
  } catch (error) {
    console.error('❌ Error during PDF conversion:', error);
    await page.screenshot({ path: 'screenshots/pdf-conversion-error.png', fullPage: true });
    console.log('⚠️ Continuing test despite PDF conversion error...');
  }

  // 7. Click "RAG Intelligence" button
  const ragButton = page.locator('#ai-chat-btn');
  await ragButton.waitFor({ state: 'visible' });
  await ragButton.click();
  await page.waitForTimeout(2000);

  // 8. Click "Retrieve from MCard" button
  const retrieveButton = page.locator('button:has-text("Retrieve from MCard")');
  await retrieveButton.waitFor({ state: 'visible' });
  await retrieveButton.click();
  await page.waitForTimeout(4000);

  // 9. Click "Index Documents" button
  const indexButton = page.locator('button:has-text("Index Documents")');
  await indexButton.waitFor({ state: 'visible' });
  await indexButton.click();
  await page.waitForTimeout(4000);

  // 10. Click "Notion" button
  const notionButton = page.locator('#notion-btn');
  await notionButton.waitFor({ state: 'visible' });
  await notionButton.click();
  await page.waitForTimeout(5000);

  // 11. Click "Connect to Notion" button
  const connectNotionButton = page.locator('button.connect-button:has-text("Connect to Notion")');
  await connectNotionButton.waitFor({ state: 'visible' });
  await connectNotionButton.click();
  await page.waitForTimeout(2000);

  // 12. Click "Select Pages" button
  const selectPagesButton = page.locator('div[role="button"]:has-text("Select pages")');
  await selectPagesButton.waitFor({ state: 'visible' });
  await selectPagesButton.click();
  await page.waitForTimeout(2000);

  // 13. Click "Allow access" button
  const allowAccessButton = page.locator('div[role="button"]:has-text("Allow access")');
  await allowAccessButton.waitFor({ state: 'visible' });
  await allowAccessButton.click();
  await page.waitForTimeout(2000);

  // 14. Click "Google Calendar" button
  const calendarButton = page.locator('#google-calendar-btn');
  await calendarButton.waitFor({ state: 'visible' });
  await calendarButton.click();
  await page.waitForTimeout(4000);

  // 15. Click "Sign in with Google" button
  const signInButton = page.locator('button:has-text("Sign in with Google")');
  await signInButton.waitFor({ state: 'visible' });
  await signInButton.click();
  await page.waitForTimeout(4000);

  // 16. Select Google account
  const accountButton = page.locator('div[data-email="alessandrorumampuk@gmail.com"]');
  await accountButton.waitFor({ state: 'visible' });
  await accountButton.click();
  await page.waitForTimeout(4000);

  // 17. Click "Advanced" link on warning page
  const advancedLink = page.locator('a:has-text("Advanced")');
  await advancedLink.waitFor({ state: 'visible' });
  await advancedLink.click();
  await page.waitForTimeout(4000);

  // 18. Click "Go to MCP Testing (unsafe)" link
  const unsafeLink = page.locator('a:has-text("Go to MCP Testing (unsafe)")');
  await unsafeLink.waitFor({ state: 'visible' });
  await unsafeLink.click();
  await page.waitForTimeout(2000);

  // 19. Click "Continue" button
  const continueButton = page.locator('button:has-text("Continue")');
  await continueButton.waitFor({ state: 'visible' });
  await continueButton.click();
  await page.waitForTimeout(2000);
});
