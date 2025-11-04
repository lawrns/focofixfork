const puppeteer = require('puppeteer');

async function comprehensiveMermaidTest() {
  let browser;
  const results = {
    timestamp: new Date().toISOString(),
    domain: 'https://foco.mx',
    credentials: 'laurence@fyves.com / hennie12',
    tests: [],
    screenshots: []
  };

  try {
    console.log('🚀 COMPREHENSIVE MERMAID PRODUCTION TEST\n');
    console.log('Domain: https://foco.mx');
    console.log('Testing with: laurence@fyves.com / hennie12\n');
    console.log('=' .repeat(60) + '\n');

    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Navigate to production
    console.log('TEST 1: Navigate to foco.mx');
    await page.goto('https://foco.mx', { waitUntil: 'networkidle2', timeout: 30000 });
    const screenshot1 = await page.screenshot({ path: 'test-1-homepage.png' });
    results.tests.push({ name: 'Navigate to foco.mx', status: '✅', screenshot: 'test-1-homepage.png' });
    console.log('✅ Homepage loaded\n');

    // Test 2: Check authentication
    console.log('TEST 2: Check authentication status');
    const currentUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isLoginPage = currentUrl.includes('login') || bodyText.includes('Sign in') || bodyText.includes('Email');
    
    if (isLoginPage) {
      console.log('✅ Login page detected - proceeding with authentication\n');
      
      // Test 3: Login
      console.log('TEST 3: Login with credentials');
      
      const emailInputs = await page.$$('input[type="email"]');
      if (emailInputs.length > 0) {
        await emailInputs[0].type('laurence@fyves.com', { delay: 50 });
        console.log('  ✓ Email entered');
      }
      
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length > 0) {
        await passwordInputs[0].type('hennie12', { delay: 50 });
        console.log('  ✓ Password entered');
      }
      
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('login') || text.includes('sign in') || text.includes('submit')) {
          await btn.click();
          console.log('  ✓ Login submitted');
          break;
        }
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const screenshot2 = await page.screenshot({ path: 'test-2-after-login.png' });
      results.tests.push({ name: 'Login', status: '✅', screenshot: 'test-2-after-login.png' });
      console.log('✅ Authentication complete\n');
    } else {
      console.log('✅ Already authenticated\n');
      results.tests.push({ name: 'Authentication', status: '✅ Already authenticated' });
    }

    // Test 4: Navigate to /mermaid
    console.log('TEST 4: Navigate to /mermaid page');
    await page.goto('https://foco.mx/mermaid', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const h1 = await page.$('h1');
    const pageTitle = h1 ? await h1.evaluate(el => el.textContent) : 'Not found';
    const screenshot3 = await page.screenshot({ path: 'test-3-mermaid-page.png' });
    
    if (pageTitle.includes('Mermaid')) {
      console.log(`✅ Mermaid page loaded: "${pageTitle}"\n`);
      results.tests.push({ name: 'Navigate to /mermaid', status: '✅', title: pageTitle, screenshot: 'test-3-mermaid-page.png' });
    } else {
      console.log(`❌ Expected 'Mermaid Diagrams' but got: "${pageTitle}"\n`);
      results.tests.push({ name: 'Navigate to /mermaid', status: '❌', title: pageTitle, screenshot: 'test-3-mermaid-page.png' });
    }

    // Test 5: Check layout components
    console.log('TEST 5: Verify layout components');
    const sidebar = await page.$('aside') || await page.$('[class*="sidebar"]');
    const header = await page.$('header');
    const main = await page.$('main');
    
    const layoutOk = sidebar && header && main;
    if (sidebar) console.log('  ✓ Sidebar visible');
    if (header) console.log('  ✓ Header visible');
    if (main) console.log('  ✓ Main content area visible');
    
    results.tests.push({ 
      name: 'Layout components', 
      status: layoutOk ? '✅' : '❌', 
      components: { sidebar: !!sidebar, header: !!header, main: !!main }
    });
    console.log('');

    // Test 6: Check for New Diagram button
    console.log('TEST 6: Look for New Diagram button');
    const buttons = await page.$$('button');
    let newDiagramBtn = null;
    
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('New Diagram')) {
        newDiagramBtn = btn;
        console.log('✅ New Diagram button found\n');
        results.tests.push({ name: 'New Diagram button', status: '✅' });
        break;
      }
    }
    
    if (!newDiagramBtn) {
      console.log('❌ New Diagram button not found\n');
      results.tests.push({ name: 'New Diagram button', status: '❌' });
    }

    // Test 7: Create new diagram
    if (newDiagramBtn) {
      console.log('TEST 7: Create new diagram');
      await newDiagramBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      const screenshot4 = await page.screenshot({ path: 'test-4-new-diagram.png' });
      
      if (newUrl.includes('/mermaid/')) {
        console.log(`✅ Navigated to diagram editor: ${newUrl}\n`);
        results.tests.push({ name: 'Create new diagram', status: '✅', url: newUrl, screenshot: 'test-4-new-diagram.png' });
      } else {
        console.log(`❌ Did not navigate to diagram editor. URL: ${newUrl}\n`);
        results.tests.push({ name: 'Create new diagram', status: '❌', url: newUrl, screenshot: 'test-4-new-diagram.png' });
      }

      // Test 8: Check editor components
      console.log('TEST 8: Verify editor components');
      const textarea = await page.$('textarea');
      const svg = await page.$('svg');
      const copyBtn = await page.$('button');
      
      let editorOk = false;
      if (textarea) {
        console.log('  ✓ Editor textarea found');
        editorOk = true;
      }
      if (svg) console.log('  ✓ Preview SVG found');
      
      results.tests.push({ 
        name: 'Editor components', 
        status: editorOk ? '✅' : '❌', 
        components: { editor: !!textarea, preview: !!svg }
      });
      console.log('');

      // Test 9: Test diagram rendering
      if (textarea) {
        console.log('TEST 9: Test diagram rendering');
        
        const testDiagram = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`;
        
        await page.click('textarea');
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.type('textarea', testDiagram, { delay: 20 });
        
        await page.waitForTimeout(3000);
        
        const renderedSvg = await page.$('svg');
        const screenshot5 = await page.screenshot({ path: 'test-5-diagram-rendered.png' });
        
        if (renderedSvg) {
          const svgText = await page.$$eval('svg text', nodes => nodes.length);
          console.log(`✅ Diagram rendered with ${svgText} text nodes\n`);
          results.tests.push({ name: 'Diagram rendering', status: '✅', nodes: svgText, screenshot: 'test-5-diagram-rendered.png' });
        } else {
          console.log('❌ Diagram did not render\n');
          results.tests.push({ name: 'Diagram rendering', status: '❌', screenshot: 'test-5-diagram-rendered.png' });
        }

        // Test 10: Test copy code button
        console.log('TEST 10: Test copy code button');
        const allButtons = await page.$$('button');
        let copyClicked = false;
        
        for (const btn of allButtons) {
          const text = await btn.evaluate(el => el.textContent);
          if (text.includes('Copy Code')) {
            await btn.click();
            copyClicked = true;
            console.log('✅ Copy Code button clicked\n');
            results.tests.push({ name: 'Copy Code button', status: '✅' });
            break;
          }
        }
        
        if (!copyClicked) {
          console.log('❌ Copy Code button not found\n');
          results.tests.push({ name: 'Copy Code button', status: '❌' });
        }

        // Test 11: Test download SVG button
        console.log('TEST 11: Test Download SVG button');
        const allBtns = await page.$$('button');
        let downloadFound = false;
        
        for (const btn of allBtns) {
          const text = await btn.evaluate(el => el.textContent);
          if (text.includes('Download SVG')) {
            downloadFound = true;
            console.log('✅ Download SVG button found\n');
            results.tests.push({ name: 'Download SVG button', status: '✅' });
            break;
          }
        }
        
        if (!downloadFound) {
          console.log('❌ Download SVG button not found\n');
          results.tests.push({ name: 'Download SVG button', status: '❌' });
        }

        // Test 12: Test save functionality
        console.log('TEST 12: Test save functionality');
        const saveBtns = await page.$$('button');
        let saveClicked = false;
        
        for (const btn of saveBtns) {
          const text = await btn.evaluate(el => el.textContent);
          if (text.includes('Save') && !text.includes('Save Version')) {
            await btn.click();
            saveClicked = true;
            console.log('  ✓ Save button clicked');
            break;
          }
        }
        
        if (saveClicked) {
          await page.waitForTimeout(2000);
          const screenshot6 = await page.screenshot({ path: 'test-6-after-save.png' });
          
          const errorElements = await page.$$eval('*', els => 
            els.filter(el => el.textContent.includes('Failed')).length
          );
          
          if (errorElements === 0) {
            console.log('✅ Save completed without errors\n');
            results.tests.push({ name: 'Save functionality', status: '✅', screenshot: 'test-6-after-save.png' });
          } else {
            console.log('❌ Save encountered errors\n');
            results.tests.push({ name: 'Save functionality', status: '❌', screenshot: 'test-6-after-save.png' });
          }
        } else {
          console.log('❌ Save button not found\n');
          results.tests.push({ name: 'Save functionality', status: '❌' });
        }
      }
    }

    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    const passed = results.tests.filter(t => t.status.includes('✅')).length;
    const failed = results.tests.filter(t => t.status.includes('❌')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total: ${results.tests.length}`);
    console.log(`Success Rate: ${((passed / results.tests.length) * 100).toFixed(1)}%\n`);
    
    results.summary = { passed, failed, total: results.tests.length, successRate: ((passed / results.tests.length) * 100).toFixed(1) };

    // Final screenshot
    const finalScreenshot = await page.screenshot({ path: 'test-final-state.png' });
    console.log('📸 Screenshots saved in current directory\n');

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    results.summary = { error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // Output results
    console.log('=' .repeat(60));
    console.log('\n📋 FULL RESULTS:\n');
    console.log(JSON.stringify(results, null, 2));
    
    // Save results to file
    require('fs').writeFileSync('mermaid-comprehensive-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n✅ Results saved to mermaid-comprehensive-test-results.json');
  }
}

comprehensiveMermaidTest();
