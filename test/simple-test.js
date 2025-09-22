import { chromium } from 'playwright';

(async () => {
  console.log('Starting browser test...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:5176', { timeout: 30000 });

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'homepage-test.png' });

    console.log('Checking page title...');
    const title = await page.title();
    console.log('Page title:', title);

    console.log('Looking for navigation elements...');

    // Try to find login link
    const loginLink = await page.$('a[href*="login"]') ||
                     await page.$('button:has-text("Login")') ||
                     await page.$('text="Login"');
    if (loginLink) {
      console.log('✓ Login link found');
    } else {
      console.log('✗ Login link not found');
    }

    // Check for main content
    const mainContent = await page.$('main, .main-content, #root');
    if (mainContent) {
      console.log('✓ Main content found');
    } else {
      console.log('✗ Main content not found');
    }

    console.log('✓ Basic frontend test completed successfully!');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();