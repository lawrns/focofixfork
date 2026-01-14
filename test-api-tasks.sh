#!/bin/bash

# API Task Routes Test Script
# Tests all task endpoints with and without authentication

set -e

BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
TOTAL=0

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}API Task Routes Verification Test${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Helper function to test an endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local auth="$5"
  local expect_status="$6"
  local expect_ok="$7"

  TOTAL=$((TOTAL + 1))

  echo -e "${YELLOW}Test $TOTAL: $name${NC}"
  echo "  Method: $method"
  echo "  Endpoint: $endpoint"
  echo "  Auth: $auth"
  echo "  Expected Status: $expect_status"
  echo "  Expected ok: $expect_ok"

  # Build curl command
  local cmd="curl -s -w '\n%{http_code}\n' -X $method '$BASE_URL$endpoint'"

  if [ "$method" = "POST" ] || [ "$method" = "PATCH" ]; then
    if [ -n "$data" ]; then
      cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi
  fi

  if [ "$auth" != "none" ]; then
    # Note: In a real scenario, you would pass an actual auth token here
    cmd="$cmd -H 'Cookie: auth-token=invalid_token'"
  fi

  # Execute curl command
  response=$(eval "$cmd")

  # Extract status code (last line)
  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  echo "  Response Status: $status"

  # Check if it's a valid JSON response
  if ! echo "$body" | jq . > /dev/null 2>&1; then
    echo -e "${RED}FAIL: Response is not valid JSON${NC}"
    echo "  Body: $body"
    FAILED=$((FAILED + 1))
    echo ""
    return 1
  fi

  # Extract ok field
  ok=$(echo "$body" | jq -r '.ok' 2>/dev/null || echo "null")
  echo "  Response ok: $ok"

  # Check status code
  if [ "$status" != "$expect_status" ]; then
    echo -e "${RED}FAIL: Expected status $expect_status, got $status${NC}"
    FAILED=$((FAILED + 1))
    echo ""
    return 1
  fi

  # Check ok field
  if [ "$ok" != "$expect_ok" ]; then
    echo -e "${RED}FAIL: Expected ok=$expect_ok, got ok=$ok${NC}"
    echo "  Body: $body"
    FAILED=$((FAILED + 1))
    echo ""
    return 1
  fi

  # Verify response envelope
  if ! echo "$body" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}FAIL: Response missing 'error' field${NC}"
    FAILED=$((FAILED + 1))
    echo ""
    return 1
  fi

  if ! echo "$body" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${RED}FAIL: Response missing 'data' field${NC}"
    FAILED=$((FAILED + 1))
    echo ""
    return 1
  fi

  if [ "$expect_ok" = "false" ]; then
    # When error, check error structure
    error_code=$(echo "$body" | jq -r '.error.code' 2>/dev/null)
    echo "  Error Code: $error_code"
    if [ "$error_code" = "null" ] || [ -z "$error_code" ]; then
      echo -e "${RED}FAIL: Error response missing 'error.code'${NC}"
      FAILED=$((FAILED + 1))
      echo ""
      return 1
    fi
  fi

  echo -e "${GREEN}PASS${NC}"
  PASSED=$((PASSED + 1))
  echo ""
  return 0
}

# Test 1: GET /api/tasks without auth (should 401)
test_endpoint \
  "GET /api/tasks without auth" \
  "GET" \
  "/api/tasks" \
  "" \
  "none" \
  "401" \
  "false"

# Test 2: POST /api/tasks without auth (should 401)
test_endpoint \
  "POST /api/tasks without auth" \
  "POST" \
  "/api/tasks" \
  '{"title":"Test Task","project_id":"test-id"}' \
  "none" \
  "401" \
  "false"

# Test 3: GET /api/tasks/[id] without auth (should 401)
test_endpoint \
  "GET /api/tasks/[id] without auth" \
  "GET" \
  "/api/tasks/test-id" \
  "" \
  "none" \
  "401" \
  "false"

# Test 4: PATCH /api/tasks/[id] without auth (should 401)
test_endpoint \
  "PATCH /api/tasks/[id] without auth" \
  "PATCH" \
  "/api/tasks/test-id" \
  '{"title":"Updated"}' \
  "none" \
  "401" \
  "false"

# Test 5: DELETE /api/tasks/[id] without auth (should 401)
test_endpoint \
  "DELETE /api/tasks/[id] without auth" \
  "DELETE" \
  "/api/tasks/test-id" \
  "" \
  "none" \
  "401" \
  "false"

# Test 6: POST /api/tasks/batch without auth (should 401)
test_endpoint \
  "POST /api/tasks/batch without auth" \
  "POST" \
  "/api/tasks/batch" \
  '{"taskIds":["id1"],"operation":"complete"}' \
  "none" \
  "401" \
  "false"

# Test 7: GET /api/tasks/[id]/subtasks without auth (should 401)
test_endpoint \
  "GET /api/tasks/[id]/subtasks without auth" \
  "GET" \
  "/api/tasks/test-id/subtasks" \
  "" \
  "none" \
  "401" \
  "false"

# Test 8: POST /api/tasks/[id]/subtasks without auth (should 401)
test_endpoint \
  "POST /api/tasks/[id]/subtasks without auth" \
  "POST" \
  "/api/tasks/test-id/subtasks" \
  '{"title":"Subtask"}' \
  "none" \
  "401" \
  "false"

# Test 9: GET /api/tasks/[id]/tags without auth (should 401)
test_endpoint \
  "GET /api/tasks/[id]/tags without auth" \
  "GET" \
  "/api/tasks/test-id/tags" \
  "" \
  "none" \
  "401" \
  "false"

# Test 10: POST /api/tasks/[id]/tags without auth (should 401)
test_endpoint \
  "POST /api/tasks/[id]/tags without auth" \
  "POST" \
  "/api/tasks/test-id/tags" \
  '{"tag_ids":["tag-id"]}' \
  "none" \
  "401" \
  "false"

# Test 11: GET /api/tasks/[id]/time-entries without auth (should 401)
test_endpoint \
  "GET /api/tasks/[id]/time-entries without auth" \
  "GET" \
  "/api/tasks/test-id/time-entries" \
  "" \
  "none" \
  "401" \
  "false"

# Test 12: POST /api/tasks/[id]/time-entries without auth (should 401)
test_endpoint \
  "POST /api/tasks/[id]/time-entries without auth" \
  "POST" \
  "/api/tasks/test-id/time-entries" \
  '{"startTime":"2024-01-01T00:00:00Z","endTime":"2024-01-01T01:00:00Z","durationSeconds":3600}' \
  "none" \
  "401" \
  "false"

# Print summary
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
