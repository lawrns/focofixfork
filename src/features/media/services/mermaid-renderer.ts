/**
 * Mermaid Renderer Service
 * 
 * Renders Mermaid diagrams to PNG/SVG/PDF using Puppeteer
 * Falls back gracefully if Puppeteer is not available
 */

import type { MermaidExportOptions, MermaidRenderResult } from '../types';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Lazy-loaded puppeteer instance
let puppeteer: typeof import('puppeteer') | null = null;

/**
 * Check if Mermaid rendering is available
 */
export function isMermaidRenderingAvailable(): boolean {
  if (isBrowser) return false;
  try {
    require.resolve('puppeteer');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize puppeteer lazily
 */
async function getPuppeteer(): Promise<typeof import('puppeteer') | null> {
  if (isBrowser) return null;
  if (puppeteer) return puppeteer;
  
  try {
    puppeteer = await import('puppeteer');
    return puppeteer;
  } catch (error) {
    console.warn('Puppeteer not available:', error);
    return null;
  }
}

/**
 * Create HTML template for Mermaid rendering
 */
function createMermaidHtml(mermaidCode: string, theme: string = 'default'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    #diagram {
      display: inline-block;
    }
    /* Ensure proper sizing */
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div id="diagram" class="mermaid">
${mermaidCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
      securityLevel: 'strict',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    
    // Wait for rendering and notify
    window.addEventListener('load', async () => {
      await mermaid.run();
      document.body.setAttribute('data-rendered', 'true');
    });
  </script>
</body>
</html>
`;
}

/**
 * Render Mermaid code to PNG
 */
export async function renderMermaidToPng(
  mermaidCode: string,
  options: { width?: number; height?: number; theme?: string } = {}
): Promise<MermaidRenderResult> {
  const pptr = await getPuppeteer();
  
  if (!pptr) {
    return {
      success: false,
      format: 'png',
      error: 'Puppeteer not available. Mermaid rendering requires server environment with puppeteer installed.',
    };
  }

  let browser;
  
  try {
    // Launch browser
    browser = await pptr.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: options.width || 1200,
      height: options.height || 800,
      deviceScaleFactor: 2, // High DPI for crisp images
    });

    // Load Mermaid HTML
    const html = createMermaidHtml(mermaidCode, options.theme);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for Mermaid to render
    await page.waitForSelector('[data-rendered="true"]', { timeout: 30000 });
    
    // Additional wait for SVG to be fully rendered
    await page.waitForFunction(() => {
      const svg = document.querySelector('.mermaid svg');
      return svg && svg.getBoundingClientRect().width > 0;
    }, { timeout: 10000 });

    // Get the diagram element
    const diagramElement = await page.$('#diagram svg') || await page.$('.mermaid svg');
    
    if (!diagramElement) {
      return {
        success: false,
        format: 'png',
        error: 'Could not find rendered Mermaid diagram',
      };
    }

    // Take screenshot of the diagram element
    const screenshotBuffer = await diagramElement.screenshot({
      type: 'png',
      omitBackground: true,
    });

    return {
      success: true,
      data: Buffer.from(screenshotBuffer),
      format: 'png',
    };

  } catch (error) {
    console.error('Error rendering Mermaid to PNG:', error);
    return {
      success: false,
      format: 'png',
      error: error instanceof Error ? error.message : 'Unknown error during rendering',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Render Mermaid code to SVG
 */
export async function renderMermaidToSvg(
  mermaidCode: string,
  options: { theme?: string } = {}
): Promise<MermaidRenderResult> {
  const pptr = await getPuppeteer();
  
  if (!pptr) {
    return {
      success: false,
      format: 'svg',
      error: 'Puppeteer not available. Mermaid rendering requires server environment with puppeteer installed.',
    };
  }

  let browser;
  
  try {
    browser = await pptr.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Load Mermaid HTML
    const html = createMermaidHtml(mermaidCode, options.theme);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for Mermaid to render
    await page.waitForSelector('[data-rendered="true"]', { timeout: 30000 });
    
    // Extract SVG content
    const svgContent = await page.evaluate(() => {
      const svg = document.querySelector('.mermaid svg');
      if (!svg) return null;
      
      // Clone to avoid modifying the rendered element
      const clone = svg.cloneNode(true) as SVGElement;
      
      // Ensure proper namespace
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // Add styles for standalone SVG
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        .node rect, .node circle, .node ellipse, .node polygon {
          fill: #fff;
          stroke: #333;
          stroke-width: 1px;
        }
        .edgePath .path {
          stroke: #333;
          stroke-width: 1.5px;
          fill: none;
        }
        text {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `;
      clone.insertBefore(style, clone.firstChild);
      
      return new XMLSerializer().serializeToString(clone);
    });

    if (!svgContent) {
      return {
        success: false,
        format: 'svg',
        error: 'Could not extract SVG content',
      };
    }

    return {
      success: true,
      data: svgContent,
      format: 'svg',
    };

  } catch (error) {
    console.error('Error rendering Mermaid to SVG:', error);
    return {
      success: false,
      format: 'svg',
      error: error instanceof Error ? error.message : 'Unknown error during rendering',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Render Mermaid to PDF (PNG embedded in PDF)
 * Uses jspdf which is already a dependency
 */
export async function renderMermaidToPdf(
  mermaidCode: string,
  options: { width?: number; height?: number; diagramName?: string } = {}
): Promise<MermaidRenderResult> {
  // First render to PNG
  const pngResult = await renderMermaidToPng(mermaidCode, options);
  
  if (!pngResult.success || !pngResult.data || !(pngResult.data instanceof Buffer)) {
    return {
      success: false,
      format: 'pdf',
      error: pngResult.error || 'Failed to generate PNG for PDF',
    };
  }

  try {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf');
    
    // Convert PNG buffer to base64 data URL
    const pngBase64 = pngResult.data.toString('base64');
    const imgData = `data:image/png;base64,${pngBase64}`;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [options.width || 1200, options.height || 800],
    });
    
    // Add image to PDF
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    
    // Add title if provided
    if (options.diagramName) {
      pdf.setFontSize(12);
      pdf.text(options.diagramName, 20, pageHeight - 20);
    }
    
    // Return PDF as buffer
    const pdfArrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
    const pdfBuffer = Buffer.from(new Uint8Array(pdfArrayBuffer));
    
    return {
      success: true,
      data: pdfBuffer,
      format: 'pdf',
    };

  } catch (error) {
    console.error('Error creating PDF:', error);
    return {
      success: false,
      format: 'pdf',
      error: error instanceof Error ? error.message : 'Failed to create PDF',
    };
  }
}

/**
 * Validate Mermaid syntax
 */
export async function validateMermaidSyntax(mermaidCode: string): Promise<{ valid: boolean; error?: string }> {
  const pptr = await getPuppeteer();
  
  if (!pptr) {
    // Can't validate without puppeteer, assume valid
    return { valid: true };
  }

  let browser;
  
  try {
    browser = await pptr.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Create validation HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="diagram" class="mermaid">
${mermaidCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </div>
  <div id="error"></div>
  <script>
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    
    (async () => {
      try {
        await mermaid.run({ querySelector: '#diagram' });
        document.body.setAttribute('data-valid', 'true');
      } catch (err) {
        document.body.setAttribute('data-valid', 'false');
        document.getElementById('error').textContent = err.message;
      }
    })();
  </script>
</body>
</html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait a bit for validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const valid = await page.evaluate(() => document.body.getAttribute('data-valid') === 'true');
    const error = await page.evaluate(() => document.getElementById('error')?.textContent || '');
    
    return { valid, error: valid ? undefined : error };

  } catch (err) {
    return { valid: false, error: String(err) };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
