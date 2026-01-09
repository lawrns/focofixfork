#!/bin/bash

##############################################################################
# Project Management E2E Test Runner (US-2.1 to US-2.4)
#
# This script runs the Project Management user story tests and generates
# a comprehensive test report.
#
# Usage:
#   ./run-project-management-tests.sh [browser]
#
# Arguments:
#   browser - Optional. chromium (default), firefox, or webkit
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BROWSER=${1:-chromium}
TEST_FILE="tests/e2e/user-stories-project-management.spec.ts"
BASE_URL="http://localhost:3000"
REPORT_DIR="test-results/project-management"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}║          Project Management E2E Test Suite (US-2.1 to US-2.4)            ║${NC}"
echo -e "${BLUE}║                                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}Running pre-flight checks...${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed:${NC} $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm installed:${NC} $(npm --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found. Run from project root directory.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ package.json found${NC}"

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}✗ Test file not found: $TEST_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Test file found${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ Warning: .env.local not found${NC}"
    echo -e "  Supabase connection may fail without environment variables"
fi

# Check if server is running
echo ""
echo -e "${YELLOW}Checking if development server is running...${NC}"
if curl -s --head --request GET "$BASE_URL" | grep "200\|301\|302" > /dev/null; then
    echo -e "${GREEN}✓ Development server is running at $BASE_URL${NC}"
else
    echo -e "${RED}✗ Development server is not running${NC}"
    echo -e "${YELLOW}  Please start the server with: npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Test Configuration:${NC}"
echo -e "  Browser: ${GREEN}$BROWSER${NC}"
echo -e "  Base URL: ${GREEN}$BASE_URL${NC}"
echo -e "  Test File: ${GREEN}$TEST_FILE${NC}"
echo -e "  Demo User: ${GREEN}manager@demo.foco.local${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Run the tests
echo -e "${YELLOW}Starting test execution...${NC}"
echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""

# Run tests and capture output
if npx playwright test "$TEST_FILE" --project="$BROWSER" --reporter=list,html; then
    TEST_STATUS="PASSED"
    STATUS_COLOR=$GREEN
else
    TEST_STATUS="FAILED"
    STATUS_COLOR=$RED
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""

# Generate summary
echo -e "${BLUE}Test Execution Summary${NC}"
echo -e "Status: ${STATUS_COLOR}$TEST_STATUS${NC}"
echo ""

# Display test report location
echo -e "${YELLOW}Test Report:${NC}"
echo -e "  HTML Report: ${GREEN}playwright-report/index.html${NC}"
echo -e "  Run: ${BLUE}npx playwright show-report${NC}"
echo ""

# Display user stories tested
echo -e "${BLUE}User Stories Tested:${NC}"
echo -e "  ${GREEN}✓${NC} US-2.1: Create Project (title, description, team, timeline)"
echo -e "  ${GREEN}✓${NC} US-2.2: View Projects (list, filter, sort)"
echo -e "  ${GREEN}✓${NC} US-2.3: Update Project (edit details, status)"
echo -e "  ${GREEN}✓${NC} US-2.4: Delete Project (archive, restore, delete)"
echo ""

# Show next steps
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Review HTML report: ${GREEN}npx playwright show-report${NC}"
echo -e "  2. Check test guide: ${GREEN}tests/e2e/PROJECT_MANAGEMENT_TEST_GUIDE.md${NC}"
echo -e "  3. Review any failed tests and debug"
echo ""

# Exit with appropriate code
if [ "$TEST_STATUS" = "PASSED" ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the report.${NC}"
    exit 1
fi
