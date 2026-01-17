import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  await page.goto('https://foco.mx/login');
  
  await page.fill('input[type="email"]', 'laurence@fyves.com');
  await page.fill('input[type="password"]', 'hennie12');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for dashboard...');
  try {
    await page.waitForURL(/.*dashboard|.*projects|.*my-work/, { timeout: 15000 });
    console.log('Logged in! URL:', page.url());
    
    // Capture some of the page content
    const content = await page.content();
    console.log('Page title:', await page.title());
    
    // Find all buttons and links to understand the UI
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        ariaLabel: b.getAttribute('aria-label'),
        id: b.id,
        classes: b.className
      }));
    });
    console.log('Buttons found:', JSON.stringify(buttons, null, 2));
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText,
        href: a.href,
        classes: a.className
      }));
    });
    console.log('Links found:', JSON.stringify(links, null, 2));

    await page.screenshot({ path: 'dashboard-debug.png' });
    console.log('Screenshot saved to dashboard-debug.png');

  } catch (e) {
    console.error('Failed to login or load dashboard:', e.message);
    await page.screenshot({ path: 'login-failed-debug.png' });
  }
  
  await browser.close();
})();
