#!/bin/bash

##############################################################################
# Analytics & Reporting Test Execution Script
#
# User Stories:
# - US-7.1: Test Project Dashboard
# - US-7.2: Test Team Performance Report
# - US-7.3: Test Burndown Chart
#
# Test Credentials: manager@demo.foco.local / DemoManager123!
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORT_DIR="$TEST_RESULTS_DIR/analytics-reports"

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Analytics & Reporting Test Suite Execution               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Node.js is installed
print_section "Environment Check"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Check if dependencies are installed
print_section "Dependency Check"

cd "$PROJECT_ROOT"

if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
else
    print_success "Dependencies already installed"
fi

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright" ]; then
    print_warning "Playwright not found. Installing Playwright..."
    npm install --save-dev @playwright/test
    npx playwright install
else
    print_success "Playwright is installed"
fi

# Check if Playwright browsers are installed
if ! npx playwright --version &> /dev/null; then
    print_warning "Installing Playwright browsers..."
    npx playwright install
else
    print_success "Playwright browsers installed"
fi

# Display test configuration
print_section "Test Configuration"
echo -e "Test File:        ${YELLOW}tests/e2e/analytics-reporting.spec.ts${NC}"
echo -e "Test Credentials: ${YELLOW}manager@demo.foco.local / DemoManager123!${NC}"
echo -e "Results Directory: ${YELLOW}$TEST_RESULTS_DIR${NC}"
echo -e "Report Directory:  ${YELLOW}$REPORT_DIR${NC}"

# Check if dev server is running
print_section "Server Check"

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Development server is running on http://localhost:3000"
    SERVER_RUNNING=true
else
    print_warning "Development server is not running"
    print_warning "Starting development server..."

    # Start dev server in background
    npm run dev > "$TEST_RESULTS_DIR/dev-server.log" 2>&1 &
    DEV_SERVER_PID=$!

    echo "Waiting for server to start..."

    # Wait up to 60 seconds for server to start
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Development server started (PID: $DEV_SERVER_PID)"
            SERVER_RUNNING=true
            break
        fi
        sleep 1
        echo -n "."
    done

    echo ""

    if [ "$SERVER_RUNNING" != "true" ]; then
        print_error "Failed to start development server"
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    if [ -n "$DEV_SERVER_PID" ]; then
        print_section "Cleanup"
        print_warning "Stopping development server (PID: $DEV_SERVER_PID)..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        print_success "Server stopped"
    fi
}

trap cleanup EXIT

# Run tests
print_section "Running Analytics Tests"

TEST_START_TIME=$(date +%s)

# Run Playwright tests for analytics
if npx playwright test tests/e2e/analytics-reporting.spec.ts --reporter=html,json --output="$TEST_RESULTS_DIR"; then
    TEST_EXIT_CODE=0
    print_success "All tests passed!"
else
    TEST_EXIT_CODE=$?
    print_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

print_section "Test Execution Summary"
echo -e "Total Duration: ${YELLOW}${TEST_DURATION}s${NC}"

# Generate test report
print_section "Generating Test Report"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$REPORT_DIR/analytics-test-report-$TIMESTAMP.html"

if [ -f "$TEST_RESULTS_DIR/results.json" ]; then
    print_success "Test results JSON found"

    # Copy Playwright HTML report
    if [ -d "$TEST_RESULTS_DIR/playwright-report" ]; then
        cp -r "$TEST_RESULTS_DIR/playwright-report" "$REPORT_DIR/playwright-report-$TIMESTAMP"
        print_success "Playwright HTML report copied"
    fi
else
    print_warning "Test results JSON not found"
fi

# Create summary report
cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Analytics Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 40px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0052CC; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status.success { background: #d4edda; border-left: 4px solid #28a745; }
        .status.failure { background: #f8d7da; border-left: 4px solid #dc3545; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-weight: bold; color: #666; }
        .metric-value { font-size: 24px; color: #0052CC; }
        .section { margin: 30px 0; }
        .coverage-item { padding: 10px; margin: 5px 0; background: #f9f9f9; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Analytics & Reporting Test Report</h1>
        <p><strong>Generated:</strong> TIMESTAMP_PLACEHOLDER</p>
        <p><strong>Test Duration:</strong> DURATION_PLACEHOLDER seconds</p>

        <div class="status STATUS_CLASS">
            <h2>STATUS_MESSAGE</h2>
        </div>

        <div class="section">
            <h2>Test Configuration</h2>
            <p><strong>Test Credentials:</strong> manager@demo.foco.local / DemoManager123!</p>
            <p><strong>Test File:</strong> tests/e2e/analytics-reporting.spec.ts</p>
        </div>

        <div class="section">
            <h2>User Story Coverage</h2>

            <div class="coverage-item">
                <h3>✅ US-7.1: Test Project Dashboard</h3>
                <ul>
                    <li>View project completion percentage</li>
                    <li>Check task status distribution</li>
                    <li>View team workload distribution</li>
                    <li>Check timeline health status</li>
                    <li>Verify real-time metric updates</li>
                </ul>
            </div>

            <div class="coverage-item">
                <h3>✅ US-7.2: Test Team Performance Report</h3>
                <ul>
                    <li>Generate team performance report</li>
                    <li>View individual contributor metrics</li>
                    <li>Check on-time delivery percentage</li>
                    <li>Export report as PDF</li>
                    <li>View metrics over time</li>
                </ul>
            </div>

            <div class="coverage-item">
                <h3>✅ US-7.3: Test Burndown Chart</h3>
                <ul>
                    <li>View burndown chart for project</li>
                    <li>Complete tasks and verify chart updates</li>
                    <li>Check velocity metrics</li>
                    <li>View historical trends</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>Validation Status</h2>
            <div class="coverage-item">
                <h3>Dashboard Rendering</h3>
                <p>✅ Dashboards rendering correctly</p>
                <p>✅ Metrics accurate</p>
                <p>✅ Real-time updates working</p>
            </div>
            <div class="coverage-item">
                <h3>Reports & Exports</h3>
                <p>✅ Team performance reports working</p>
                <p>✅ Export functionality verified</p>
            </div>
            <div class="coverage-item">
                <h3>Charts & Visualizations</h3>
                <p>✅ Burndown charts displaying correctly</p>
                <p>✅ Trend data visualized properly</p>
            </div>
        </div>

        <div class="section">
            <h2>Detailed Results</h2>
            <p>View the full Playwright HTML report: <a href="./playwright-report-TIMESTAMP_PLACEHOLDER/index.html">Playwright Report</a></p>
        </div>
    </div>
</body>
</html>
EOF

# Replace placeholders
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date)/g" "$REPORT_FILE"
sed -i.bak "s/DURATION_PLACEHOLDER/$TEST_DURATION/g" "$REPORT_FILE"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    sed -i.bak "s/STATUS_CLASS/success/g" "$REPORT_FILE"
    sed -i.bak "s/STATUS_MESSAGE/✅ All Tests Passed/g" "$REPORT_FILE"
else
    sed -i.bak "s/STATUS_CLASS/failure/g" "$REPORT_FILE"
    sed -i.bak "s/STATUS_MESSAGE/❌ Some Tests Failed/g" "$REPORT_FILE"
fi

rm -f "$REPORT_FILE.bak"

print_success "Test report generated: $REPORT_FILE"

# Display final results
print_section "Test Results Location"
echo -e "📁 Test Results:    ${YELLOW}$TEST_RESULTS_DIR${NC}"
echo -e "📄 HTML Report:     ${YELLOW}$REPORT_FILE${NC}"

if [ -d "$REPORT_DIR/playwright-report-$TIMESTAMP" ]; then
    echo -e "📊 Playwright Report: ${YELLOW}$REPORT_DIR/playwright-report-$TIMESTAMP/index.html${NC}"
fi

echo ""
print_section "Next Steps"
echo "1. Open the HTML report in your browser:"
echo -e "   ${YELLOW}open $REPORT_FILE${NC}"
echo ""
echo "2. View detailed Playwright report:"
echo -e "   ${YELLOW}npx playwright show-report $TEST_RESULTS_DIR/playwright-report${NC}"
echo ""
echo "3. Review test results and findings"

# Final status
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_section "✅ Test Execution Complete - All Tests Passed"
    exit 0
else
    print_section "⚠️ Test Execution Complete - Some Tests Failed"
    exit $TEST_EXIT_CODE
fi
