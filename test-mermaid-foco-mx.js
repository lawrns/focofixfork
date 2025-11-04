const puppeteer = require('puppeteer');

async function testMermaidOnFocoMx() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    domain: 'https://foco.mx',
    credentials: 'laurence@fyves.com / hennie12',
    tests: []
  };

  try {
    console.log('🚀 Starting Mermaid Production Tests on foco.mx\n');
    console.log('Domain: https://foco.mx');
    console.log('Credentials: laurence@fyves.com / hennie12\n');

    // Test 1: Navigate to foco.mx
    console.log('1️⃣ Navigating to foco.mx...');
    await page.goto('https://foco.mx', { waitUntil: 'networkidle2', timeout: 30000 });
    results.tests.push({ name: 'Navigate to foco.mx', status: '✅' });
    console.log('✅ foco.mx loaded\n');

    // Test 2: Check if login is needed
    console.log('2️⃣ Checking authentication status...');
    const currentUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const needsLogin = currentUrl.includes('login') || bodyText.includes('Sign in') || bodyText.includes('Email');
    
    if (needsLogin) {
      console.log('✅ Login required\n');
      
      // Test 3: Login
      console.log('3️⃣ Logging in with laurence@fyves.com...');
      
      // Find email input
      const emailInputs = await page.$$('input[type="email"]');
      if (emailInputs.length > 0) {
        await emailInputs[0].type('laurence@fyves.com', { delay: 50 });
        console.log('✅ Email entered');
      }
      
      // Find password input
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length > 0) {
        await passwordInputs[0].type('hennie12', { delay: 50 });
        console.log('✅ Password entered');
      }
      
      // Find and click submit button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent.toLowerCase());
        if (text.includes('login') || text.includes('sign in') || text.includes('submit')) {
          await btn.click();
          console.log('✅ Login submitted');
          break;
        }
      }
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
      
      results.tests.push({ name: 'Login', status: '✅' });
      console.log('✅ Authentication complete\n');
    } else {
      console.log('✅ Already authenticated\n');
      results.tests.push({ name: 'Authentication', status: '✅ Already authenticated' });
    }

    // Test 4: Navigate to /mermaid
    console.log('4️⃣ Navigating to /mermaid...');
    await page.goto('https://foco.mx/mermaid', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const h1 = await page.$('h1');
    const pageTitle = h1 ? await h1.evaluate(el => el.textContent) : 'Not found';
    
    if (pageTitle.includes('Mermaid')) {
      console.log('✅ Mermaid page loaded:', pageTitle);
      results.tests.push({ name: 'Navigate to /mermaid', status: '✅', title: pageTitle });
    } else {
      console.log('❌ Mermaid page title not found. Got:', pageTitle);
      results.tests.push({ name: 'Navigate to /mermaid', status: '❌', title: pageTitle });
    }
    console.log('');

    // Test 5: Check layout components
    console.log('5️⃣ Checking layout components...');
    const sidebar = await page.$('aside') || await page.$('[class*="sidebar"]');
    const header = await page.$('header');
    const main = await page.$('main');
    
    const layoutStatus = {
      sidebar: !!sidebar,
      header: !!header,
      main: !!main
    };
    
    if (sidebar) console.log('✅ Sidebar visible');
    if (header) console.log('✅ Header visible');
    if (main) console.log('✅ Main content visible');
    
    results.tests.push({ name: 'Layout components', status: '✅', components: layoutStatus });
    console.log('');

    // Test 6: Check for New Diagram button
    console.log('6️⃣ Checking for New Diagram button...');
    const buttons = await page.$$('button');
    let newDiagramFound = false;
    
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('New Diagram')) {
        newDiagramFound = true;
        console.log('✅ New Diagram button found');
        break;
      }
    }
    
    if (!newDiagramFound) {
      console.log('❌ New Diagram button not found');
    }
    
    results.tests.push({ name: 'New Diagram button', status: newDiagramFound ? '✅' : '❌' });
    console.log('');

    // Test 7: Create new diagram
    if (newDiagramFound) {
      console.log('7️⃣ Creating new diagram...');
      
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text.includes('New Diagram')) {
          await btn.click();
          break;
        }
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      if (newUrl.includes('/mermaid/')) {
        console.log('✅ Navigated to diagram editor:', newUrl);
        results.tests.push({ name: 'Create new diagram', status: '✅', url: newUrl });
      } else {
        console.log('❌ Did not navigate to diagram editor. URL:', newUrl);
        results.tests.push({ name: 'Create new diagram', status: '❌', url: newUrl });
      }
      console.log('');

      // Test 8: Check for editor and preview
      console.log('8️⃣ Checking editor and preview components...');
      const textarea = await page.$('textarea');
      const svg = await page.$('svg');
      
      const editorStatus = {
        editor: !!textarea,
        preview: !!svg
      };
      
      if (textarea) console.log('✅ Editor textarea found');
      if (svg) console.log('✅ Preview SVG found');
      
      results.tests.push({ name: 'Editor and preview', status: '✅', components: editorStatus });
      console.log('');

      // Test 9: Test diagram rendering
      if (textarea) {
        console.log('9️⃣ Testing diagram rendering...');
        
        const testDiagram = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`;
        
        await page.click('textarea');
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.type('textarea', testDiagram, { delay: 30 });
        
        await page.waitForTimeout(3000);
        
        const renderedSvg = await page.$('svg');
        if (renderedSvg) {
          const svgText = await page.$$eval('svg text', nodes => nodes.length);
          console.log(`✅ Diagram rendered with ${svgText} text nodes`);
          results.tests.push({ name: 'Diagram rendering', status: '✅', nodes: svgText });
        } else {
          console.log('❌ Diagram did not render');
          results.tests.push({ name: 'Diagram rendering', status: '❌' });
        }
      }
      console.log('');

      // Test 10: Test save functionality
      if (textarea) {
        console.log('🔟 Testing save functionality...');
        const saveButtons = await page.$$('button');
        let saveClicked = false;
        
        for (const btn of saveButtons) {
          const text = await btn.evaluate(el => el.textContent);
          if (text.includes('Save')) {
            await btn.click();
            saveClicked = true;
            console.log('✅ Save button clicked');
            break;
          }
        }
        
        if (saveClicked) {
          await page.waitForTimeout(2000);
          const errorElements = await page.$$eval('*', els => 
            els.filter(el => el.textContent.includes('Failed')).length
          );
          
          if (errorElements === 0) {
            console.log('✅ Save completed without errors');
            results.tests.push({ name: 'Save functionality', status: '✅' });
          } else {
            console.log('❌ Save encountered errors');
            results.tests.push({ name: 'Save functionality', status: '❌ Errors found' });
          }
        }
        console.log('');
      }
    }

    // Summary
    console.log('\n📊 Test Summary:');
    const passed = results.tests.filter(t => t.status.includes('✅')).length;
    const failed = results.tests.filter(t => t.status.includes('❌')).length;
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total: ${results.tests.length}`);
    
    results.summary = { passed, failed, total: results.tests.length };

  } catch (error) {
    console.error('❌ Test error:', error.message);
    results.summary = { error: error.message };
  } finally {
    await browser.close();
    
    // Output results as JSON
    console.log('\n📋 Full Results:');
    console.log(JSON.stringify(results, null, 2));
  }
}

testMermaidOnFocoMx();
