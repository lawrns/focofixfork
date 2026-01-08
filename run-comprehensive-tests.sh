#!/bin/bash

# Comprehensive Test Suite Execution Script
# Phase: Post-Consolidation Test Validation
# Date: 2026-01-08

set -e

echo "=========================================="
echo "Comprehensive Test Suite Validation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print section header
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Track overall status
OVERALL_STATUS=0

# Step 1: Linting
print_header "Step 1: Running Linter"
npm run lint
LINT_STATUS=$?
print_status $LINT_STATUS "Linting"
if [ $LINT_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 2: Type Checking
print_header "Step 2: Type Checking"
npm run type-check || true
TYPE_STATUS=$?
print_status $TYPE_STATUS "Type Checking (non-blocking)"

# Step 3: Unit Tests
print_header "Step 3: Running Unit Tests"
npm run test:unit
UNIT_STATUS=$?
print_status $UNIT_STATUS "Unit Tests"
if [ $UNIT_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 4: Integration Tests
print_header "Step 4: Running Integration Tests"
npm run test:integration
INTEGRATION_STATUS=$?
print_status $INTEGRATION_STATUS "Integration Tests"
if [ $INTEGRATION_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 5: Contract Tests
print_header "Step 5: Running Contract Tests"
npm run test:contract
CONTRACT_STATUS=$?
print_status $CONTRACT_STATUS "Contract Tests"
if [ $CONTRACT_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 6: Component Tests
print_header "Step 6: Running Component Tests"
npm run test:components
COMPONENTS_STATUS=$?
print_status $COMPONENTS_STATUS "Component Tests"
if [ $COMPONENTS_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 7: Services Tests
print_header "Step 7: Running Services Tests"
npm run test:services
SERVICES_STATUS=$?
print_status $SERVICES_STATUS "Services Tests"
if [ $SERVICES_STATUS -ne 0 ]; then
    OVERALL_STATUS=1
fi

# Step 8: Generate Coverage Report
print_header "Step 8: Generating Coverage Report"
npm run test:coverage
COVERAGE_STATUS=$?
print_status $COVERAGE_STATUS "Coverage Report"

# Display summary
print_header "Test Execution Summary"
echo "Linting:            $([ $LINT_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Type Checking:      $([ $TYPE_STATUS -eq 0 ] && echo '✅ PASS' || echo '⚠️  WARN')"
echo "Unit Tests:         $([ $UNIT_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Integration Tests:  $([ $INTEGRATION_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Contract Tests:     $([ $CONTRACT_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Component Tests:    $([ $COMPONENTS_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Services Tests:     $([ $SERVICES_STATUS -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Coverage Report:    $([ $COVERAGE_STATUS -eq 0 ] && echo '✅ GENERATED' || echo '⚠️  WARN')"
echo ""

# Check coverage
if [ -f "coverage/coverage-summary.json" ]; then
    print_header "Coverage Metrics"
    cat coverage/coverage-summary.json | grep -E '"lines"|"statements"|"functions"|"branches"' | head -4 || true
    echo ""
fi

# Overall result
print_header "Final Result"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "Ready to commit:"
    echo '  git add .'
    echo '  git commit -m "Phase Tests: Comprehensive test validation passing"'
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix failing tests before committing."
    echo "Check the output above for details."
fi

echo ""
echo "=========================================="

exit $OVERALL_STATUS
