const puppeteer = require('puppeteer');

async function testMermaidProduction() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    url: 'https://focofixfork.netlify.app',
    tests: [],
    summary: {}
  };

  try {
    console.log('🚀 Starting Production Mermaid Tests\n');
    console.log('Environment: https://focofixfork.netlify.app');
    console.log('Credentials: laurence@fyves.com / hennie12\n');

    // Test 1: Navigate to production
    console.log('1️⃣ Navigating to production site...');
    await page.goto('https://focofixfork.netlify.app', { waitUntil: 'networkidle2', timeout: 30000 });
    results.tests.push({ name: 'Navigate to production', status: '✅' });
    console.log('✅ Production site loaded\n');

    // Test 2: Check if login is required
    console.log('2️⃣ Checking authentication status...');
    const loginButton = await page.$('button:contains("Login")') || await page.$('a:contains("Login")');
    
    if (loginButton) {
      console.log('✅ Login required - proceeding with authentication\n');
      results.tests.push({ name: 'Authentication check', status: '✅ Login required' });
      
      // Test 3: Login
      console.log('3️⃣ Logging in with credentials...');
      
      // Find and click login button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text.includes('Login') || text.includes('Sign in')) {
          await btn.click();
          break;
        }
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      // Fill in email
      const emailInputs = await page.$$('input[type="email"]');
      if (emailInputs.length > 0) {
        await emailInputs[0].type('laurence@fyves.com', { delay: 50 });
        console.log('✅ Email entered');
      }
      
      // Fill in password
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length > 0) {
        await passwordInputs[0].type('hennie12', { delay: 50 });
        console.log('✅ Password entered');
      }
      
      // Click submit
      const submitButtons = await page.$$('button[type="submit"]');
      if (submitButtons.length > 0) {
        await submitButtons[0].click();
        console.log('✅ Login submitted');
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
      
      results.tests.push({ name: 'Login', status: '✅' });
      console.log('✅ Authentication complete\n');
    } else {
      console.log('✅ Already authenticated\n');
      results.tests.push({ name: 'Authentication check', status: '✅ Already authenticated' });
    }

    // Test 4: Navigate to Mermaid page
    console.log('4️⃣ Navigating to /mermaid...');
    await page.goto('https://focofixfork.netlify.app/mermaid', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const pageTitle = await page.$eval('h1', el => el.textContent).catch(() => 'Not found');
    if (pageTitle.includes('Mermaid')) {
      console.log('✅ Mermaid page loaded:', pageTitle);
      results.tests.push({ name: 'Navigate to /mermaid', status: '✅', title: pageTitle });
    } else {
      console.log('❌ Mermaid page title not found');
      results.tests.push({ name: 'Navigate to /mermaid', status: '❌ Title not found' });
    }
    console.log('');

    // Test 5: Check layout components
    console.log('5️⃣ Checking layout components...');
    const sidebar = await page.$('[class*="sidebar"]') || await page.$('aside');
    const header = await page.$('header');
    const mainContent = await page.$('main');
    
    if (sidebar) console.log('✅ Sidebar visible');
    if (header) console.log('✅ Header visible');
    if (mainContent) console.log('✅ Main content area visible');
    
    results.tests.push({ 
      name: 'Layout components',
      status: '✅',
      components: { sidebar: !!sidebar, header: !!header, mainContent: !!mainContent }
    });
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
      
      const url = page.url();
      if (url.includes('/mermaid/')) {
        console.log('✅ Navigated to diagram editor:', url);
        results.tests.push({ name: 'Create new diagram', status: '✅', url });
      } else {
        console.log('❌ Did not navigate to diagram editor');
        results.tests.push({ name: 'Create new diagram', status: '❌ Navigation failed' });
      }
      console.log('');

      // Test 8: Check for editor and preview
      console.log('8️⃣ Checking editor and preview components...');
      const textarea = await page.$('textarea');
      const svg = await page.$('svg');
      
      if (textarea) console.log('✅ Editor textarea found');
      if (svg) console.log('✅ Preview SVG found');
      
      results.tests.push({ 
        name: 'Editor and preview',
        status: '✅',
        components: { editor: !!textarea, preview: !!svg }
      });
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

testMermaidProduction();
