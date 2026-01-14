/**
 * Bundle Size Analysis Script
 * Analyzes Next.js bundle sizes and identifies optimization opportunities
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_LIMITS = {
  firstLoadJS: 200, // 200KB for First Load JS
  totalJS: 500, // 500KB for total JS
  page: 100, // 100KB per page
};

function analyzeBundle() {
  console.log('\n📦 Bundle Size Analysis');
  console.log('═'.repeat(100));

  const buildDir = path.join(process.cwd(), '.next');
  const buildManifestPath = path.join(buildDir, 'build-manifest.json');

  if (!fs.existsSync(buildManifestPath)) {
    console.log('\n⚠️  No build found. Run `npm run build` first.\n');
    return;
  }

  // Read build manifest
  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

  // Analyze pages
  const pages = Object.keys(buildManifest.pages || {});
  const pageAnalysis = [];

  console.log('\n📄 Page Bundle Sizes:\n');
  console.log('Page'.padEnd(40) + 'First Load JS'.padEnd(20) + 'Status');
  console.log('─'.repeat(100));

  pages.forEach(page => {
    const pageFiles = buildManifest.pages[page] || [];
    let totalSize = 0;

    pageFiles.forEach(file => {
      const filePath = path.join(buildDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
    });

    const sizeKB = (totalSize / 1024).toFixed(1);
    const status = totalSize / 1024 > BUNDLE_SIZE_LIMITS.page ? '⚠️  Large' : '✅ Good';

    pageAnalysis.push({
      page,
      size: totalSize,
      sizeKB: parseFloat(sizeKB),
      status: totalSize / 1024 > BUNDLE_SIZE_LIMITS.page ? 'large' : 'good',
    });

    console.log(page.padEnd(40) + `${sizeKB} KB`.padEnd(20) + status);
  });

  // Find largest pages
  console.log('\n\n📊 Largest Pages:\n');
  const largestPages = pageAnalysis
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  largestPages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.page.padEnd(40)} ${page.sizeKB} KB`);
  });

  // Identify heavy dependencies
  console.log('\n\n📚 Optimization Opportunities:\n');

  const recommendations = [];

  // Check for large pages
  const heavyPages = pageAnalysis.filter(p => p.sizeKB > BUNDLE_SIZE_LIMITS.page);
  if (heavyPages.length > 0) {
    recommendations.push({
      priority: 'High',
      issue: `${heavyPages.length} page(s) exceed ${BUNDLE_SIZE_LIMITS.page}KB limit`,
      pages: heavyPages.map(p => p.page).slice(0, 3),
      solution: 'Implement code splitting and dynamic imports',
      impact: 'Reduce initial page load by 30-50%',
    });
  }

  // Common optimization recommendations
  recommendations.push(
    {
      priority: 'High',
      issue: 'Large JavaScript bundles',
      solution: 'Use Next.js dynamic imports for heavy components',
      example: 'const Editor = dynamic(() => import("@/components/Editor"))',
      impact: 'Reduce bundle size by 20-40%',
    },
    {
      priority: 'High',
      issue: 'Duplicate dependencies across pages',
      solution: 'Use Next.js shared chunks and optimize splitChunks config',
      impact: 'Reduce total bundle size by 15-30%',
    },
    {
      priority: 'Medium',
      issue: 'Large third-party libraries',
      solution: 'Use lighter alternatives or tree-shaking',
      examples: [
        'moment → date-fns (smaller, tree-shakeable)',
        'lodash → lodash-es (tree-shakeable)',
        'recharts → lighter charting library',
      ],
      impact: 'Reduce bundle size by 50-100KB',
    },
    {
      priority: 'Medium',
      issue: 'Unused dependencies',
      solution: 'Remove unused imports and dependencies',
      tool: 'Use webpack-bundle-analyzer to identify',
      impact: 'Reduce bundle size by 10-20%',
    },
    {
      priority: 'Low',
      issue: 'CSS-in-JS overhead',
      solution: 'Consider CSS Modules or Tailwind JIT',
      impact: 'Reduce runtime CSS processing',
    }
  );

  recommendations.forEach(rec => {
    const prioritySymbol = rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢';
    console.log(`${prioritySymbol} [${rec.priority}] ${rec.issue}`);
    if (rec.pages) {
      console.log(`   Affected: ${rec.pages.join(', ')}`);
    }
    console.log(`   Solution: ${rec.solution}`);
    if (rec.example) {
      console.log(`   Example: ${rec.example}`);
    }
    if (rec.examples) {
      rec.examples.forEach(ex => console.log(`   - ${ex}`));
    }
    if (rec.tool) {
      console.log(`   Tool: ${rec.tool}`);
    }
    console.log(`   Impact: ${rec.impact}\n`);
  });

  // Bundle analysis summary
  console.log('═'.repeat(100));
  console.log('\n📈 Summary:\n');
  console.log(`  Total Pages Analyzed: ${pages.length}`);
  console.log(`  Pages Over Limit: ${heavyPages.length}`);
  console.log(`  Average Page Size: ${(pageAnalysis.reduce((sum, p) => sum + p.sizeKB, 0) / pages.length).toFixed(1)} KB`);
  console.log(`  Largest Page: ${largestPages[0]?.page} (${largestPages[0]?.sizeKB} KB)`);

  // Performance budget status
  console.log('\n🎯 Performance Budget Status:\n');
  const budgetStatus = [
    {
      metric: 'First Load JS',
      limit: `${BUNDLE_SIZE_LIMITS.firstLoadJS} KB`,
      status: largestPages[0]?.sizeKB > BUNDLE_SIZE_LIMITS.firstLoadJS ? '❌ Exceeded' : '✅ Within Budget',
    },
    {
      metric: 'Average Page Size',
      limit: `${BUNDLE_SIZE_LIMITS.page} KB`,
      status: (pageAnalysis.reduce((sum, p) => sum + p.sizeKB, 0) / pages.length) > BUNDLE_SIZE_LIMITS.page ? '⚠️  Close to Limit' : '✅ Within Budget',
    },
  ];

  budgetStatus.forEach(budget => {
    console.log(`  ${budget.metric.padEnd(25)} ${budget.limit.padEnd(15)} ${budget.status}`);
  });

  console.log('\n═'.repeat(100));

  // Action items
  console.log('\n✅ Next Steps:\n');
  console.log('  1. Run webpack-bundle-analyzer to visualize bundle composition');
  console.log('     npm run analyze');
  console.log('\n  2. Implement dynamic imports for heavy components');
  console.log('     const Component = dynamic(() => import("./Component"))');
  console.log('\n  3. Enable Next.js optimizations in next.config.js:');
  console.log('     - swcMinify: true');
  console.log('     - optimizeFonts: true');
  console.log('     - modularizeImports for large libraries');
  console.log('\n  4. Use Next.js Image component for optimized images');
  console.log('     <Image src="..." width={...} height={...} />');
  console.log('\n  5. Monitor bundle size in CI/CD pipeline\n');
}

// Run analysis
if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle };
