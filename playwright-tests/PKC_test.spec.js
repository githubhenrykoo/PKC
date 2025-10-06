import { test, expect } from '@playwright/test';

test('MCard website flow test', async ({ page }) => {

  // 1. Open the URL
  await page.goto('http://localhost:4321');
  await page.waitForTimeout(2000); // individual wait

  // 2. Click Push to Start button
  await page.click('#pushButton');
  await page.waitForTimeout(10000);

  // 3. Click only the first MCard button in the navigation list
  const firstNavItem = page.locator('#nav-items button.nav-link').first();

  await firstNavItem.waitFor({ state: 'visible' });
  const buttonText = await firstNavItem.textContent();
  console.log(`Clicking first navigation item: ${buttonText.trim()}`);
    
  try {
      await firstNavItem.click();
      console.log('Successfully clicked the first item');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // optional after click wait
    } catch (error) {
      console.error('Error clicking the first item:', error);
      await page.screenshot({ path: `screenshots/error-first-nav-item.png` });
    }

  // 4. Search "Testing" in MCard input
  await page.fill('#search-input', 'Testing');
  await page.waitForTimeout(2000);

  // 5. Click Clear button
  await page.click('#search-clear');
  await page.waitForTimeout(2000);

  // 6. Click "RAG Intelligence" button
  const ragButton = page.locator('#ai-chat-btn');
  await ragButton.waitFor({ state: 'visible' });
  await ragButton.click();
  await page.waitForTimeout(2000);

  // 7. Click "Retrieve from MCard" button
  const retrieveButton = page.locator('button:has-text("Retrieve from MCard")');
  await retrieveButton.waitFor({ state: 'visible' });
  await retrieveButton.click();
  await page.waitForTimeout(4000);

  // 8. Click "Index Documents" button
  const indexButton = page.locator('button:has-text("Index Documents")');
  await indexButton.waitFor({ state: 'visible' });
  await indexButton.click();
  await page.waitForTimeout(4000);

  // 9. Click "Notion" button
  const notionButton = page.locator('#notion-btn');
  await notionButton.waitFor({ state: 'visible' });
  await notionButton.click();
  await page.waitForTimeout(5000);

  // 10. Click "Connect to Notion" button
  const connectNotionButton = page.locator('button.connect-button:has-text("Connect to Notion")');
  await connectNotionButton.waitFor({ state: 'visible' });
  await connectNotionButton.click();
  await page.waitForTimeout(2000);

  // 11. Click "Select Pages" button
  const selectPagesButton = page.locator('div[role="button"]:has-text("Select pages")');
  await selectPagesButton.waitFor({ state: 'visible' });
  await selectPagesButton.click();
  await page.waitForTimeout(2000);

  // 12. Click "Allow access" button
  const allowAccessButton = page.locator('div[role="button"]:has-text("Allow access")');
  await allowAccessButton.waitFor({ state: 'visible' });
  await allowAccessButton.click();
  await page.waitForTimeout(2000);

  // 13. Click "Google Calendar" button
  const calendarButton = page.locator('#google-calendar-btn');
  await calendarButton.waitFor({ state: 'visible' });
  await calendarButton.click();
  await page.waitForTimeout(4000);

  // 14. Click "Sign in with Google" button
  const signInButton = page.locator('button:has-text("Sign in with Google")');
  await signInButton.waitFor({ state: 'visible' });
  await signInButton.click();
  await page.waitForTimeout(4000);

  // 15. Select Google account
  const accountButton = page.locator('div[data-email="alessandrorumampuk@gmail.com"]');
  await accountButton.waitFor({ state: 'visible' });
  await accountButton.click();
  await page.waitForTimeout(4000);

  // 12. Click "Advanced" link on warning page
  const advancedLink = page.locator('a:has-text("Advanced")');
  await advancedLink.waitFor({ state: 'visible' });
  await advancedLink.click();
  await page.waitForTimeout(4000);

  // 13. Click "Go to MCP Testing (unsafe)" link
  const unsafeLink = page.locator('a:has-text("Go to MCP Testing (unsafe)")');
  await unsafeLink.waitFor({ state: 'visible' });
  await unsafeLink.click();
  await page.waitForTimeout(2000);

  // 14. Click "Continue" button
  const continueButton = page.locator('button:has-text("Continue")');
  await continueButton.waitFor({ state: 'visible' });
  await continueButton.click();
  await page.waitForTimeout(2000);
});
