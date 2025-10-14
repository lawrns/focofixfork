#!/bin/bash

# Monitor deployment status
echo "🔄 Monitoring deployment status..."
echo "Looking for Service Worker version 1.0.21 with circuit breaker..."
echo ""

EXPECTED_VERSION="1.0.21"
MAX_CHECKS=20  # 10 minutes (30s * 20)
CURRENT_CHECK=0

while [ $CURRENT_CHECK -lt $MAX_CHECKS ]; do
    CURRENT_CHECK=$((CURRENT_CHECK + 1))
    echo "Check #$CURRENT_CHECK of $MAX_CHECKS at $(date '+%H:%M:%S')"

    # Fetch service worker and check version
    SW_CONTENT=$(curl -s https://foco.mx/sw.js | head -100)
    VERSION=$(echo "$SW_CONTENT" | grep -o "SW_VERSION.*=.*['\"].*['\"]" | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+")
    HAS_CIRCUIT=$(echo "$SW_CONTENT" | grep -c "circuitBreaker")

    echo "  Current version: ${VERSION:-unknown}"
    echo "  Has circuit breaker: $([ $HAS_CIRCUIT -gt 0 ] && echo 'Yes' || echo 'No')"

    if [ "$VERSION" = "$EXPECTED_VERSION" ] && [ $HAS_CIRCUIT -gt 0 ]; then
        echo ""
        echo "✅ Deployment complete! New service worker is live."
        echo ""
        break
    fi

    if [ $CURRENT_CHECK -lt $MAX_CHECKS ]; then
        echo "  Waiting 30 seconds..."
        echo ""
        sleep 30
    fi
done

if [ "$VERSION" != "$EXPECTED_VERSION" ]; then
    echo "⚠️  Timeout waiting for deployment. Current version: ${VERSION:-unknown}"
    echo "   Proceeding with tests on current deployment..."
fi

echo ""
echo "========================================="
echo "Starting production tests..."
echo "========================================="
echo ""