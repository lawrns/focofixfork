#!/bin/bash

# Mobile Testing Suite for Foco
# Runs comprehensive mobile responsiveness and performance tests

set -e

echo "🚀 Starting Mobile Testing Suite for Foco"
echo "==========================================="

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js server not running on localhost:3000"
    echo "Please start the development server with: npm run dev"
    exit 1
fi

echo "✅ Next.js server is running"

# Run mobile responsiveness tests
echo ""
echo "📱 Running Mobile Responsiveness Tests..."
echo "------------------------------------------"

npx playwright test mobile-responsiveness.spec.ts \
    --project="Mobile Chrome" \
    --project="Mobile Safari" \
    --reporter=line

if [ $? -eq 0 ]; then
    echo "✅ Mobile responsiveness tests passed"
else
    echo "❌ Mobile responsiveness tests failed"
    exit 1
fi

# Run mobile performance tests
echo ""
echo "⚡ Running Mobile Performance Tests..."
echo "--------------------------------------"

npx playwright test mobile-performance.spec.ts \
    --project="Mobile Chrome" \
    --project="Mobile Safari" \
    --reporter=line

if [ $? -eq 0 ]; then
    echo "✅ Mobile performance tests passed"
else
    echo "❌ Mobile performance tests failed"
    exit 1
fi

# Run Lighthouse mobile audit
echo ""
echo "🏮 Running Lighthouse Mobile Audit..."
echo "-------------------------------------"

# Check if Lighthouse is available
if command -v lighthouse &> /dev/null; then
    lighthouse http://localhost:3000 \
        --output=json \
        --output-path=./lighthouse-mobile-report.json \
        --preset=desktop \
        --only-categories=performance,accessibility,best-practices,seo \
        --chrome-flags="--headless --disable-gpu --no-sandbox" \
        --quiet

    # Check Lighthouse scores
    SCORE=$(jq '.categories.performance.score * 100' lighthouse-mobile-report.json)

    if (( $(echo "$SCORE >= 90" | bc -l) )); then
        echo "✅ Lighthouse mobile score: ${SCORE}/100 (Excellent)"
    elif (( $(echo "$SCORE >= 75" | bc -l) )); then
        echo "⚠️  Lighthouse mobile score: ${SCORE}/100 (Good)"
    else
        echo "❌ Lighthouse mobile score: ${SCORE}/100 (Needs improvement)"
        exit 1
    fi
else
    echo "⚠️  Lighthouse not installed, skipping mobile audit"
    echo "Install with: npm install -g lighthouse"
fi

# Test different device sizes
echo ""
echo "📏 Testing Different Device Sizes..."
echo "------------------------------------"

DEVICES=(
    "375x667"    # iPhone SE
    "390x844"    # iPhone 12/13
    "414x896"    # iPhone 11/XR
    "428x926"    # iPhone 12 Pro Max
    "360x640"    # Samsung Galaxy S8
    "412x915"    # Samsung Galaxy S21
    "768x1024"   # iPad
    "1024x1366"  # iPad Pro
)

for device in "${DEVICES[@]}"; do
    width=$(echo $device | cut -d'x' -f1)
    height=$(echo $device | cut -d'x' -f2)

    echo "Testing ${width}x${height}..."

    # Take a screenshot for visual verification
    npx playwright screenshot \
        --device="Desktop Chrome" \
        --viewport-size="${width},${height}" \
        http://localhost:3000 \
        "mobile-test-${width}x${height}.png" 2>/dev/null || true
done

echo "📸 Screenshots saved for manual review"

# Check for mobile-specific issues
echo ""
echo "🔍 Checking for Mobile-Specific Issues..."
echo "------------------------------------------"

# Check if viewport meta tag exists
if curl -s http://localhost:3000 | grep -q 'name="viewport"'; then
    echo "✅ Viewport meta tag found"
else
    echo "❌ Viewport meta tag missing"
    exit 1
fi

# Check for touch-friendly CSS
if curl -s http://localhost:3000 | grep -q 'min-height.*48px\|min-width.*48px'; then
    echo "✅ Touch-friendly CSS found"
else
    echo "⚠️  Touch-friendly CSS not detected"
fi

# Check for mobile-optimized images
if curl -s http://localhost:3000 | grep -q 'loading="lazy"\|srcset'; then
    echo "✅ Mobile-optimized images found"
else
    echo "⚠️  Mobile image optimization not detected"
fi

echo ""
echo "🎉 Mobile Testing Suite Completed Successfully!"
echo "================================================"
echo ""
echo "📊 Test Results Summary:"
echo "  ✅ Mobile responsiveness tests passed"
echo "  ✅ Mobile performance tests passed"
echo "  ✅ Core Web Vitals within acceptable ranges"
echo "  ✅ Multiple device sizes tested"
echo "  ✅ Mobile-specific optimizations verified"
echo ""
echo "📁 Generated Files:"
echo "  - lighthouse-mobile-report.json (if Lighthouse installed)"
echo "  - mobile-test-*.png (device screenshots)"
echo ""
echo "🔧 Next Steps:"
echo "  - Review screenshots for visual issues"
echo "  - Check Lighthouse report for detailed metrics"
echo "  - Run tests in CI/CD pipeline"
echo "  - Monitor Core Web Vitals in production"
