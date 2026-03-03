/**
 * Browser Surface Service
 * Executes browser automation actions via Puppeteer
 */

import type { BrowserAction } from '../types';

// Puppeteer is lazy-loaded to avoid issues if not installed
async function getPuppeteer() {
  try {
    return await import('puppeteer');
  } catch {
    return null;
  }
}

export interface BrowserExecutionResult {
  success: boolean;
  data?: {
    url?: string;
    title?: string;
    screenshot?: string; // base64
    content?: string;
    elements?: Array<{ selector: string; text: string; href?: string }>;
  };
  error?: string;
}

/**
 * Execute a browser action
 */
export async function executeBrowserAction(
  action: BrowserAction,
  options: {
    headless?: boolean;
    timeout?: number;
    viewport?: { width: number; height: number };
  } = {}
): Promise<BrowserExecutionResult> {
  const puppeteer = await getPuppeteer();
  
  if (!puppeteer) {
    return {
      success: false,
      error: 'Puppeteer not available. Install with: npm install puppeteer',
    };
  }

  const browser = await puppeteer.launch({
    headless: options.headless ?? true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    if (options.viewport) {
      await page.setViewport(options.viewport);
    }

    const timeout = options.timeout ?? 30000;
    page.setDefaultTimeout(timeout);

    switch (action.type) {
      case 'navigate':
        return await handleNavigate(page, action);
      
      case 'click':
        return await handleClick(page, action);
      
      case 'fill':
        return await handleFill(page, action);
      
      case 'screenshot':
        return await handleScreenshot(page, action);
      
      case 'scrape':
        return await handleScrape(page, action);
      
      case 'scroll':
        return await handleScroll(page, action);
      
      case 'wait':
        return await handleWait(page, action);
      
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }
}

async function handleNavigate(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  if (!action.url) {
    return { success: false, error: 'URL required for navigate' };
  }

  await page.goto(action.url, { waitUntil: 'networkidle2' });
  
  return {
    success: true,
    data: {
      url: page.url(),
      title: await page.title(),
    },
  };
}

async function handleClick(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  if (!action.selector) {
    return { success: false, error: 'Selector required for click' };
  }

  await page.click(action.selector);
  
  return {
    success: true,
    data: {
      url: page.url(),
      title: await page.title(),
    },
  };
}

async function handleFill(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  if (!action.selector || !action.value) {
    return { success: false, error: 'Selector and value required for fill' };
  }

  await page.type(action.selector, action.value);
  
  return { success: true };
}

async function handleScreenshot(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  const screenshotOptions: any = {
    encoding: 'base64',
    fullPage: action.options?.fullPage ?? false,
  };

  if (action.selector) {
    const element = await page.$(action.selector);
    if (!element) {
      return { success: false, error: `Element not found: ${action.selector}` };
    }
    const screenshot = await element.screenshot(screenshotOptions);
    return {
      success: true,
      data: { screenshot },
    };
  }

  const screenshot = await page.screenshot(screenshotOptions);
  
  return {
    success: true,
    data: { screenshot },
  };
}

async function handleScrape(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  const selector = action.selector || 'body';
  
  const elements = await page.evaluate((sel: string) => {
    const nodes = document.querySelectorAll(sel);
    return Array.from(nodes).map((el: any) => ({
      tag: el.tagName,
      text: el.innerText?.slice(0, 500) || '',
      href: el.href || undefined,
      src: el.src || undefined,
    }));
  }, selector);

  return {
    success: true,
    data: {
      elements: elements.slice(0, 100), // Limit results
      content: elements.map((e: any) => e.text).join('\n').slice(0, 10000),
    },
  };
}

async function handleScroll(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  const direction = action.options?.direction || 'down';
  const amount = action.options?.amount || 500;

  await page.evaluate((dir: string, amt: number) => {
    window.scrollBy(0, dir === 'down' ? amt : -amt);
  }, direction, amount);

  return { success: true };
}

async function handleWait(page: any, action: BrowserAction): Promise<BrowserExecutionResult> {
  const delayMs: number = (action.options?.ms as number) || 1000;
  
  if (action.selector) {
    await page.waitForSelector(action.selector, { timeout: delayMs });
  } else {
    // Simple delay using setTimeout
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return { success: true };
}

/**
 * Check if browser automation is available
 */
export async function isBrowserAutomationAvailable(): Promise<boolean> {
  const puppeteer = await getPuppeteer();
  return puppeteer !== null;
}
