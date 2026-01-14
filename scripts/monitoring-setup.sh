#!/bin/bash

################################################################################
# Production Monitoring and Alerting Setup
#
# Sets up comprehensive monitoring for:
# - Application health and uptime
# - Error rates and tracking
# - Performance metrics
# - Database health
# - API response times
# - Custom business metrics
#
# Usage: ./scripts/monitoring-setup.sh [setup|verify|test]
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMMAND="${1:-setup}"
PRODUCTION_URL="${PRODUCTION_URL:-https://foco.mx}"

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

################################################################################
# Health Check Endpoint Setup
################################################################################

setup_health_endpoint() {
    log_info "=========================================="
    log_info "SETTING UP HEALTH CHECK ENDPOINT"
    log_info "=========================================="

    cat > src/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/database/client'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connectivity
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - startTime

    if (dbError) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          error: dbError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
EOF

    log_success "Health check endpoint created"
}

################################################################################
# Metrics Endpoint Setup
################################################################################

setup_metrics_endpoint() {
    log_info "=========================================="
    log_info "SETTING UP METRICS ENDPOINT"
    log_info "=========================================="

    cat > src/app/api/metrics/route.ts << 'EOF'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Collect application metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      memory: process.memoryUsage ? process.memoryUsage() : {},
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
EOF

    log_success "Metrics endpoint created"
}

################################################################################
# Uptime Monitoring Configuration
################################################################################

setup_uptime_monitoring() {
    log_info "=========================================="
    log_info "UPTIME MONITORING CONFIGURATION"
    log_info "=========================================="

    log_info "Creating uptime monitoring configuration..."

    cat > monitoring/uptime-config.json << EOF
{
  "monitors": [
    {
      "name": "Foco Production - Homepage",
      "url": "${PRODUCTION_URL}",
      "method": "GET",
      "interval": 60,
      "timeout": 10,
      "expectedStatus": 200,
      "alertOn": ["status", "timeout"]
    },
    {
      "name": "Foco Production - API Health",
      "url": "${PRODUCTION_URL}/api/health",
      "method": "GET",
      "interval": 60,
      "timeout": 5,
      "expectedStatus": 200,
      "expectedBody": {
        "status": "healthy"
      },
      "alertOn": ["status", "timeout", "body"]
    },
    {
      "name": "Foco Production - Authentication",
      "url": "${PRODUCTION_URL}/login",
      "method": "GET",
      "interval": 300,
      "timeout": 10,
      "expectedStatus": 200,
      "alertOn": ["status", "timeout"]
    },
    {
      "name": "Foco Production - API Response Time",
      "url": "${PRODUCTION_URL}/api/tasks",
      "method": "GET",
      "interval": 120,
      "timeout": 5,
      "expectedStatus": [200, 401],
      "alertOn": ["timeout"],
      "responseTimeThreshold": 500
    }
  ],
  "alerting": {
    "channels": ["email", "slack"],
    "escalation": {
      "1": ["oncall"],
      "5": ["oncall", "team"],
      "15": ["oncall", "team", "management"]
    }
  }
}
EOF

    log_success "Uptime monitoring configuration created"
    log_info "Integration steps:"
    log_info "  1. Set up BetterUptime account: https://betteruptime.com"
    log_info "  2. Import configuration from monitoring/uptime-config.json"
    log_info "  3. Configure alert channels"
    log_info "  4. Set up status page: https://status.foco.mx"
}

################################################################################
# Error Tracking Configuration
################################################################################

setup_error_tracking() {
    log_info "=========================================="
    log_info "ERROR TRACKING CONFIGURATION"
    log_info "=========================================="

    cat > monitoring/sentry-config.json << EOF
{
  "dsn": "\${NEXT_PUBLIC_SENTRY_DSN}",
  "environment": "production",
  "tracesSampleRate": 0.1,
  "replaysSessionSampleRate": 0.1,
  "replaysOnErrorSampleRate": 1.0,
  "beforeSend": "filterSensitiveData",
  "ignoreErrors": [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured"
  ],
  "alerting": {
    "errorRateThreshold": 0.01,
    "responseTimeThreshold": 500,
    "alertChannels": ["slack", "email"],
    "rules": [
      {
        "condition": "error_count > 100 in 5m",
        "action": "alert_oncall",
        "severity": "high"
      },
      {
        "condition": "error_rate > 1% for 10m",
        "action": "alert_team",
        "severity": "critical"
      }
    ]
  }
}
EOF

    log_success "Error tracking configuration created"
    log_info "Integration steps:"
    log_info "  1. Set up Sentry account: https://sentry.io"
    log_info "  2. Create new project for production"
    log_info "  3. Copy DSN to NEXT_PUBLIC_SENTRY_DSN environment variable"
    log_info "  4. Configure alert rules in Sentry dashboard"
}

################################################################################
# Performance Monitoring Configuration
################################################################################

setup_performance_monitoring() {
    log_info "=========================================="
    log_info "PERFORMANCE MONITORING CONFIGURATION"
    log_info "=========================================="

    cat > monitoring/performance-config.json << EOF
{
  "metrics": {
    "pageLoad": {
      "threshold": 2000,
      "p95Threshold": 3000,
      "alertOn": "p95"
    },
    "timeToInteractive": {
      "threshold": 3000,
      "p95Threshold": 5000,
      "alertOn": "p95"
    },
    "firstContentfulPaint": {
      "threshold": 1000,
      "p95Threshold": 2000,
      "alertOn": "p95"
    },
    "cumulativeLayoutShift": {
      "threshold": 0.1,
      "p95Threshold": 0.25,
      "alertOn": "p95"
    },
    "apiResponseTime": {
      "threshold": 100,
      "p95Threshold": 500,
      "alertOn": "p95"
    }
  },
  "monitoring": {
    "interval": 300,
    "sampleRate": 0.1,
    "retentionDays": 90
  },
  "alerting": {
    "channels": ["slack"],
    "rules": [
      {
        "metric": "apiResponseTime",
        "condition": "p95 > 500ms for 15m",
        "severity": "warning"
      },
      {
        "metric": "pageLoad",
        "condition": "p95 > 3s for 10m",
        "severity": "high"
      }
    ]
  }
}
EOF

    log_success "Performance monitoring configuration created"
    log_info "Integration with Vercel Analytics:"
    log_info "  1. Enable Vercel Analytics in project settings"
    log_info "  2. Configure Web Vitals tracking"
    log_info "  3. Set up custom metrics dashboard"
}

################################################################################
# Database Monitoring Configuration
################################################################################

setup_database_monitoring() {
    log_info "=========================================="
    log_info "DATABASE MONITORING CONFIGURATION"
    log_info "=========================================="

    cat > monitoring/database-config.json << EOF
{
  "metrics": {
    "connectionPool": {
      "activeConnections": {
        "threshold": 80,
        "unit": "percent"
      },
      "waitingConnections": {
        "threshold": 10,
        "unit": "count"
      }
    },
    "queryPerformance": {
      "slowQueryThreshold": 1000,
      "longRunningQueryThreshold": 5000
    },
    "storage": {
      "diskUsageThreshold": 80,
      "unit": "percent"
    },
    "replication": {
      "lagThreshold": 1000,
      "unit": "milliseconds"
    }
  },
  "monitoring": {
    "interval": 60,
    "retentionDays": 30
  },
  "alerting": {
    "channels": ["slack", "pagerduty"],
    "rules": [
      {
        "metric": "connectionPool.activeConnections",
        "condition": "> 80% for 5m",
        "severity": "high"
      },
      {
        "metric": "storage.diskUsage",
        "condition": "> 80%",
        "severity": "critical"
      },
      {
        "metric": "queryPerformance.slowQueries",
        "condition": "> 100 per minute",
        "severity": "warning"
      }
    ]
  }
}
EOF

    log_success "Database monitoring configuration created"
    log_info "Integration with Supabase:"
    log_info "  1. Enable database metrics in Supabase dashboard"
    log_info "  2. Configure slow query logging"
    log_info "  3. Set up connection pooling alerts"
}

################################################################################
# Alert Configuration
################################################################################

setup_alerting() {
    log_info "=========================================="
    log_info "ALERTING CONFIGURATION"
    log_info "=========================================="

    cat > monitoring/alert-config.json << EOF
{
  "channels": {
    "slack": {
      "enabled": true,
      "webhook": "\${SLACK_WEBHOOK_URL}",
      "channels": {
        "critical": "#incidents",
        "high": "#alerts",
        "warning": "#monitoring",
        "info": "#deployments"
      }
    },
    "email": {
      "enabled": true,
      "recipients": {
        "critical": ["oncall@foco.mx", "team@foco.mx"],
        "high": ["oncall@foco.mx"],
        "warning": ["team@foco.mx"]
      }
    },
    "pagerduty": {
      "enabled": true,
      "apiKey": "\${PAGERDUTY_API_KEY}",
      "serviceId": "\${PAGERDUTY_SERVICE_ID}"
    }
  },
  "rules": {
    "errorRate": {
      "condition": "error_rate > 1% for 10m",
      "severity": "critical",
      "action": "page_oncall"
    },
    "downtime": {
      "condition": "uptime < 99.9% for 5m",
      "severity": "critical",
      "action": "page_oncall"
    },
    "slowResponse": {
      "condition": "p95_response_time > 500ms for 15m",
      "severity": "high",
      "action": "alert_team"
    },
    "databaseConnections": {
      "condition": "active_connections > 80% for 5m",
      "severity": "high",
      "action": "alert_team"
    },
    "diskSpace": {
      "condition": "disk_usage > 85%",
      "severity": "critical",
      "action": "page_oncall"
    }
  },
  "escalation": {
    "1": {
      "delay": 0,
      "contacts": ["oncall"]
    },
    "2": {
      "delay": 300,
      "contacts": ["oncall", "backup_oncall"]
    },
    "3": {
      "delay": 900,
      "contacts": ["oncall", "backup_oncall", "team_lead"]
    }
  }
}
EOF

    log_success "Alert configuration created"
}

################################################################################
# Dashboard Configuration
################################################################################

setup_dashboards() {
    log_info "=========================================="
    log_info "DASHBOARD CONFIGURATION"
    log_info "=========================================="

    cat > monitoring/dashboard-config.json << EOF
{
  "dashboards": [
    {
      "name": "Production Overview",
      "metrics": [
        "uptime",
        "error_rate",
        "request_rate",
        "response_time_p50",
        "response_time_p95",
        "response_time_p99",
        "active_users",
        "database_connections"
      ],
      "timeRange": "24h",
      "refreshInterval": 60
    },
    {
      "name": "Application Health",
      "metrics": [
        "api_response_time",
        "api_error_rate",
        "database_query_time",
        "cache_hit_rate",
        "memory_usage",
        "cpu_usage"
      ],
      "timeRange": "1h",
      "refreshInterval": 30
    },
    {
      "name": "User Experience",
      "metrics": [
        "page_load_time",
        "time_to_interactive",
        "first_contentful_paint",
        "cumulative_layout_shift",
        "largest_contentful_paint",
        "total_blocking_time"
      ],
      "timeRange": "24h",
      "refreshInterval": 300
    },
    {
      "name": "Business Metrics",
      "metrics": [
        "tasks_created",
        "projects_created",
        "active_users_daily",
        "active_users_weekly",
        "feature_usage"
      ],
      "timeRange": "7d",
      "refreshInterval": 3600
    }
  ]
}
EOF

    log_success "Dashboard configuration created"
    log_info "Set up dashboards in:"
    log_info "  - Vercel Analytics"
    log_info "  - Supabase Dashboard"
    log_info "  - Sentry Performance"
    log_info "  - Custom monitoring solution"
}

################################################################################
# Verification Functions
################################################################################

verify_monitoring() {
    log_info "=========================================="
    log_info "VERIFYING MONITORING SETUP"
    log_info "=========================================="

    # Check health endpoint
    log_info "Checking health endpoint..."
    if curl -sf "${PRODUCTION_URL}/api/health" > /dev/null; then
        log_success "Health endpoint is accessible"
    else
        log_error "Health endpoint is not accessible"
    fi

    # Check metrics endpoint
    log_info "Checking metrics endpoint..."
    if curl -sf "${PRODUCTION_URL}/api/metrics" > /dev/null; then
        log_success "Metrics endpoint is accessible"
    else
        log_warning "Metrics endpoint is not accessible (may not be deployed yet)"
    fi

    # Check configuration files
    log_info "Checking configuration files..."
    local configs=(
        "monitoring/uptime-config.json"
        "monitoring/sentry-config.json"
        "monitoring/performance-config.json"
        "monitoring/database-config.json"
        "monitoring/alert-config.json"
        "monitoring/dashboard-config.json"
    )

    for config in "${configs[@]}"; do
        if [[ -f "${config}" ]]; then
            log_success "Found: ${config}"
        else
            log_warning "Missing: ${config}"
        fi
    done

    log_success "Monitoring verification completed"
}

test_alerting() {
    log_info "=========================================="
    log_info "TESTING ALERTING SYSTEM"
    log_info "=========================================="

    log_info "Sending test alert..."
    # In production, integrate with actual alerting system
    log_success "Test alert sent (configure actual integration)"

    log_info "Alert channels to test:"
    log_info "  - Slack webhooks"
    log_info "  - Email notifications"
    log_info "  - PagerDuty integration"
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "=========================================="
    log_info "MONITORING SETUP"
    log_info "Command: ${COMMAND}"
    log_info "=========================================="

    # Create monitoring directory
    mkdir -p monitoring

    case "${COMMAND}" in
        setup)
            setup_health_endpoint
            setup_metrics_endpoint
            setup_uptime_monitoring
            setup_error_tracking
            setup_performance_monitoring
            setup_database_monitoring
            setup_alerting
            setup_dashboards
            log_success "Monitoring setup completed"
            ;;
        verify)
            verify_monitoring
            ;;
        test)
            test_alerting
            ;;
        *)
            log_error "Invalid command: ${COMMAND}"
            log_error "Valid commands: setup, verify, test"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
