#!/bin/bash

# Test Suite Runner
# Runs all test suites and generates comprehensive coverage report

set -e

echo "🧪 Starting Comprehensive Test Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=0
INTEGRATION_TESTS_PASSED=0
API_TESTS_PASSED=0
E2E_TESTS_PASSED=0
SECURITY_TESTS_PASSED=0
PERFORMANCE_TESTS_PASSED=0

# Function to print section headers
print_header() {
    echo ""
    echo "======================================"
    echo "$1"
    echo "======================================"
}

# Function to check if tests passed
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 failed${NC}"
        return 1
    fi
}

# Clean previous coverage data
print_header "🧹 Cleaning previous coverage data"
rm -rf coverage
rm -rf .nyc_output
rm -rf playwright-report

# 1. Unit Tests
print_header "1️⃣ Running Unit Tests"
if npm run test:unit; then
    UNIT_TESTS_PASSED=1
    check_result "Unit tests"
else
    check_result "Unit tests"
fi

# 2. Integration Tests
print_header "2️⃣ Running Integration Tests"
if npm run test:integration; then
    INTEGRATION_TESTS_PASSED=1
    check_result "Integration tests"
else
    check_result "Integration tests"
fi

# 3. API Tests
print_header "3️⃣ Running API Tests"
if npm run test:api; then
    API_TESTS_PASSED=1
    check_result "API tests"
else
    check_result "API tests"
fi

# 4. E2E Tests
print_header "4️⃣ Running E2E Tests"
if npm run test:e2e; then
    E2E_TESTS_PASSED=1
    check_result "E2E tests"
else
    check_result "E2E tests"
fi

# 5. Security Tests
print_header "5️⃣ Running Security Tests"
if npm run test:security; then
    SECURITY_TESTS_PASSED=1
    check_result "Security tests"
else
    check_result "Security tests"
fi

# 6. Performance Tests
print_header "6️⃣ Running Performance Tests"
if npm run test:performance; then
    PERFORMANCE_TESTS_PASSED=1
    check_result "Performance tests"
else
    check_result "Performance tests"
fi

# Generate coverage report
print_header "📊 Generating Coverage Report"
npm run test:coverage

# Calculate overall results
TOTAL_SUITES=6
PASSED_SUITES=$((UNIT_TESTS_PASSED + INTEGRATION_TESTS_PASSED + API_TESTS_PASSED + E2E_TESTS_PASSED + SECURITY_TESTS_PASSED + PERFORMANCE_TESTS_PASSED))

# Print summary
print_header "📈 Test Suite Summary"
echo ""
echo "Unit Tests:        $([ $UNIT_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "Integration Tests: $([ $INTEGRATION_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "API Tests:         $([ $API_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "E2E Tests:         $([ $E2E_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "Security Tests:    $([ $SECURITY_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo "Performance Tests: $([ $PERFORMANCE_TESTS_PASSED -eq 1 ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
echo ""
echo "Overall: $PASSED_SUITES/$TOTAL_SUITES test suites passed"
echo ""

# Check coverage threshold
if [ -f "coverage/coverage-summary.json" ]; then
    print_header "📊 Coverage Analysis"

    # Extract coverage percentages (requires jq)
    if command -v jq &> /dev/null; then
        LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        STATEMENTS=$(jq '.total.statements.pct' coverage/coverage-summary.json)
        FUNCTIONS=$(jq '.total.functions.pct' coverage/coverage-summary.json)
        BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)

        echo "Lines:      ${LINES}%"
        echo "Statements: ${STATEMENTS}%"
        echo "Functions:  ${FUNCTIONS}%"
        echo "Branches:   ${BRANCHES}%"
        echo ""

        # Check if coverage meets threshold (90%)
        THRESHOLD=90
        if (( $(echo "$LINES >= $THRESHOLD" | bc -l) )); then
            echo -e "${GREEN}✅ Coverage threshold met: ${LINES}% >= ${THRESHOLD}%${NC}"
        else
            echo -e "${YELLOW}⚠️  Coverage below threshold: ${LINES}% < ${THRESHOLD}%${NC}"
        fi
    else
        echo "Install jq to see detailed coverage metrics: brew install jq"
    fi
fi

# Generate test report
print_header "📝 Generating Test Report"
npm run test:report

echo ""
print_header "🎉 Test Suite Complete"
echo ""

# Exit with appropriate code
if [ $PASSED_SUITES -eq $TOTAL_SUITES ]; then
    echo -e "${GREEN}All test suites passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some test suites failed. Please review the output above.${NC}"
    exit 1
fi
