# Production Deployment Runbook

## Overview

This runbook provides comprehensive guidance for deploying to production with zero downtime, staged rollout, and automatic rollback capabilities.

**Last Updated**: 2026-01-13
**Version**: 1.0.0
**Owner**: DevOps Team

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Stages](#deployment-stages)
3. [Monitoring and Verification](#monitoring-and-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Post-Deployment Tasks](#post-deployment-tasks)
6. [Emergency Procedures](#emergency-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Required Before Deployment

- [ ] All P0 issues resolved
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Database migrations tested in staging
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Monitoring and alerting verified
- [ ] Backup of production database created
- [ ] Environment variables verified in Vercel

### Environment Variables Verification

```bash
# Required environment variables in Vercel:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
NEXT_PUBLIC_APP_VERSION
VERCEL_TOKEN (for CI/CD)
VERCEL_ORG_ID (for CI/CD)
VERCEL_PROJECT_ID (for CI/CD)
```

### Pre-Deployment Commands

```bash
# 1. Verify all tests pass
npm run lint
npm run test:unit
npm run test:integration

# 2. Build application locally
npm run build

# 3. Run security audit
npm audit --audit-level=high

# 4. Type check
npm run type-check
```

---

## Deployment Stages

### Stage 1: Database Migration (Zero Downtime)

**Duration**: ~30 minutes
**Risk Level**: High
**Rollback Time**: 5 minutes

#### Steps

1. **Create Database Backup**
   ```bash
   ./scripts/database-migration-orchestrator.sh backup
   ```

2. **Apply RLS Policies (Non-Breaking)**
   ```bash
   # Review migrations first
   ls -la supabase/migrations/

   # Apply migrations
   ./scripts/database-migration-orchestrator.sh migrate
   ```

3. **Enable RLS on Tables**
   - RLS policies are applied without breaking existing queries
   - Gradual rollout ensures zero downtime

4. **Verify Database Integrity**
   ```bash
   ./scripts/database-migration-orchestrator.sh verify
   ```

5. **Monitor Performance for 15 Minutes**
   - Watch for query slowdowns
   - Monitor connection pool usage
   - Check error rates in Supabase dashboard

#### Success Criteria
- ✅ No query failures
- ✅ Response time < 100ms average
- ✅ Error rate < 0.1%
- ✅ All RLS policies active

#### Rollback
```bash
./scripts/database-migration-orchestrator.sh rollback
```

---

### Stage 2: Security Fixes

**Duration**: ~30 minutes
**Risk Level**: Medium
**Rollback Time**: 2 minutes

#### Steps

1. **Deploy Security Updates to Vercel**
   ```bash
   # Automated via GitHub Actions
   # Or manual:
   vercel deploy --prod
   ```

2. **Rotate Credentials (MANUAL)**
   - Log into Vercel dashboard
   - Navigate to Environment Variables
   - Rotate:
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
     - Any other sensitive keys
   - Redeploy after rotation

3. **Deploy Workspace Isolation Middleware**
   - Automatically deployed with security updates
   - Verifies user can only access their workspace data

4. **Deploy Rate Limiting**
   - API rate limits: 100 req/min per IP
   - Auth rate limits: 5 attempts per 15 min

5. **Deploy Input Validation**
   - Server-side validation for all inputs
   - XSS protection enabled

6. **Monitor Auth Flows for 15 Minutes**
   - Watch login/signup success rates
   - Monitor authentication errors
   - Verify rate limiting is working

#### Success Criteria
- ✅ All authentication flows working
- ✅ Rate limiting active
- ✅ No unauthorized access attempts
- ✅ Workspace isolation verified

#### Rollback
```bash
vercel rollback
```

---

### Stage 3: Bug Fixes

**Duration**: ~45 minutes
**Risk Level**: Low
**Rollback Time**: 2 minutes

#### Fixes Included

1. **Task Creation Fix**
   - Resolved schema mismatch issue
   - Proper error handling for tag operations

2. **Schema Alignment**
   - Database schema now matches API contracts
   - Removed references to non-existent columns

3. **Organizations API Fix**
   - Fixed query parameters
   - Proper error responses

#### Steps

1. **Deploy Bug Fixes**
   ```bash
   vercel deploy --prod
   ```

2. **Run Smoke Tests**
   ```bash
   npm run test:smoke -- --baseUrl=https://foco.mx
   ```

3. **Monitor Error Rates for 30 Minutes**
   - Watch Sentry error tracking
   - Monitor specific bug fix areas
   - Verify user reports decrease

#### Success Criteria
- ✅ Task creation working
- ✅ No schema errors
- ✅ Organizations API responding correctly
- ✅ Error rate < 0.1%

---

### Stage 4: Performance Optimizations

**Duration**: ~1 hour
**Risk Level**: Low
**Rollback Time**: 2 minutes

#### Optimizations Included

1. **Redis Caching Layer**
   - Upstash Redis integration
   - Cache frequently accessed data
   - TTL: 5 minutes for dynamic data, 1 hour for static

2. **Query Optimizations**
   - Indexed frequently queried columns
   - Optimized complex joins
   - Reduced N+1 queries

3. **Bundle Optimizations**
   - Code splitting
   - Dynamic imports for large components
   - Reduced bundle size by 30%

#### Steps

1. **Deploy Performance Updates**
   ```bash
   vercel deploy --prod
   ```

2. **Run Performance Tests**
   ```bash
   npm run test:performance -- --baseUrl=https://foco.mx
   ```

3. **Monitor Metrics for 1 Hour**
   - Page load time
   - Time to Interactive
   - API response times
   - Cache hit rates

#### Success Criteria
- ✅ Page load < 2s (p95)
- ✅ API response < 100ms (average)
- ✅ Cache hit rate > 80%
- ✅ Bundle size reduced

---

### Stage 5: New Features (Beta)

**Duration**: ~45 minutes
**Risk Level**: Low (Beta only)
**Rollback Time**: 2 minutes

#### Features Included

1. **Voice System (Beta)**
   - Voice commands for task creation
   - Voice notes and transcription
   - Beta users only via feature flag

2. **CRICO Alignment Engine (Beta)**
   - AI-powered task alignment
   - Real-time collaboration features
   - Beta users only

#### Steps

1. **Deploy with Feature Flags**
   ```bash
   # Feature flags enabled via environment variables
   NEXT_PUBLIC_ENABLE_VOICE_SYSTEM=true
   NEXT_PUBLIC_ENABLE_CRICO=true

   vercel deploy --prod
   ```

2. **Enable for Beta Users**
   - Configure beta user list in admin panel
   - Feature flags check user permissions

3. **Monitor Feature Usage**
   - Track adoption metrics
   - Monitor for errors specific to new features
   - Collect user feedback

#### Success Criteria
- ✅ Features available to beta users
- ✅ No errors from new features
- ✅ Positive user feedback
- ✅ Metrics showing usage

---

## Monitoring and Verification

### Real-Time Monitoring

#### During Deployment (Every 5 minutes)

```bash
# Check application health
curl -sf https://foco.mx/api/health | jq

# Check error rates
# Monitor in Sentry dashboard

# Check response times
# Monitor in Vercel Analytics
```

#### Key Metrics to Watch

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| Error Rate | < 0.1% | Investigate immediately |
| Response Time (p95) | < 500ms | Monitor closely |
| Page Load (p95) | < 2s | Acceptable |
| Database Connections | < 80% | Scale if needed |
| Uptime | > 99.9% | Critical alert |

### Post-Deployment Verification

```bash
# Run comprehensive smoke tests
npm run test:smoke -- --baseUrl=https://foco.mx

# Verify all P0 issues resolved
npm run test:smoke -- --grep "P0"

# Check application metrics
curl https://foco.mx/api/metrics | jq
```

---

## Rollback Procedures

### Automatic Rollback Triggers

The deployment pipeline automatically rolls back if:
- Health check fails
- Error rate > 1% for 5 minutes
- Response time > 1s (p95) for 10 minutes
- Critical test failures

### Manual Rollback

#### Vercel Rollback (2 minutes)

```bash
# Instant rollback to previous deployment
vercel rollback --token=$VERCEL_TOKEN --scope=$VERCEL_ORG_ID

# Or via Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "Promote to Production"
```

#### Database Rollback (5 minutes)

```bash
# Restore from backup
./scripts/database-migration-orchestrator.sh rollback

# Or manually:
# 1. Find latest backup
ls -la backups/database/

# 2. Restore backup
# Follow database-migration-orchestrator.sh rollback procedure
```

### Verification After Rollback

```bash
# Verify application is healthy
curl -sf https://foco.mx/api/health

# Run smoke tests
npm run test:smoke

# Check error rates have normalized
# Monitor Sentry dashboard
```

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] Verify all smoke tests pass
- [ ] Check error rates in Sentry
- [ ] Verify performance metrics in Vercel Analytics
- [ ] Monitor user reports
- [ ] Update deployment log

### Short Term (Within 24 Hours)

- [ ] Continue monitoring metrics
- [ ] Review user feedback
- [ ] Check for unexpected issues
- [ ] Update documentation if needed
- [ ] Schedule post-mortem if issues occurred

### Medium Term (Within 1 Week)

- [ ] Analyze deployment metrics
- [ ] Enable new features for all users (if beta successful)
- [ ] Schedule post-mortem review
- [ ] Document lessons learned
- [ ] Update runbook based on experience

---

## Emergency Procedures

### Production is Down (P0)

1. **Immediate Actions** (0-5 minutes)
   ```bash
   # Rollback immediately
   vercel rollback --token=$VERCEL_TOKEN

   # Check health
   curl https://foco.mx/api/health
   ```

2. **Communication** (5-10 minutes)
   - Post to status page: https://status.foco.mx
   - Notify team via Slack #incidents
   - Update customers if downtime > 5 minutes

3. **Investigation** (10+ minutes)
   - Check Sentry for errors
   - Review Vercel logs
   - Check database status in Supabase
   - Identify root cause

4. **Resolution**
   - Fix issue in code
   - Deploy hotfix
   - Verify resolution
   - Post-mortem within 48 hours

### High Error Rate (P1)

1. **Monitor Closely** (0-10 minutes)
   - Identify error patterns in Sentry
   - Check if specific to certain features
   - Determine if critical path affected

2. **Decide Action** (10-15 minutes)
   - If critical: rollback
   - If isolated: disable feature flag
   - If minor: monitor and fix in next deployment

3. **Fix**
   - Implement fix
   - Test thoroughly
   - Deploy as hotfix or in next release

### Slow Performance (P2)

1. **Identify Bottleneck**
   - Check database query times
   - Review API response times
   - Check cache hit rates

2. **Immediate Mitigation**
   - Scale database if needed
   - Clear cache if necessary
   - Disable non-critical features temporarily

3. **Long-term Fix**
   - Optimize queries
   - Improve caching strategy
   - Consider architectural changes

---

## Troubleshooting

### Common Issues

#### Deployment Fails to Build

```bash
# Check build logs in Vercel
vercel logs --token=$VERCEL_TOKEN

# Common causes:
# - TypeScript errors: npm run type-check
# - Missing env vars: check Vercel dashboard
# - Dependency issues: npm ci
```

#### Database Migration Fails

```bash
# Check Supabase logs
# Common causes:
# - Constraint violations
# - Lock timeouts
# - Permission issues

# Rollback and investigate
./scripts/database-migration-orchestrator.sh rollback
```

#### Health Check Fails After Deployment

```bash
# Check Vercel logs
vercel logs --token=$VERCEL_TOKEN

# Check Supabase connection
# Verify environment variables
# Check rate limiting
```

### Debug Commands

```bash
# Check deployment status
vercel inspect https://foco.mx --token=$VERCEL_TOKEN

# View real-time logs
vercel logs --follow --token=$VERCEL_TOKEN

# Test API endpoints
curl -v https://foco.mx/api/health
curl -v https://foco.mx/api/metrics

# Check database
npx supabase db lint
```

---

## Contact Information

### On-Call Rotation
- Primary: See PagerDuty schedule
- Backup: See PagerDuty schedule

### Communication Channels
- Incidents: #incidents (Slack)
- Monitoring: #monitoring (Slack)
- Deployments: #deployments (Slack)

### External Services
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- Sentry: https://sentry.io
- Status Page: https://status.foco.mx

---

## Appendix

### Deployment Checklist (Printable)

```
PRE-DEPLOYMENT
[ ] All tests passing
[ ] Security audit complete
[ ] Database backup created
[ ] Team notified
[ ] Rollback plan ready

DEPLOYMENT
[ ] Stage 1: Database Migration
[ ] Stage 2: Security Fixes
[ ] Stage 3: Bug Fixes
[ ] Stage 4: Performance
[ ] Stage 5: New Features

POST-DEPLOYMENT
[ ] Smoke tests pass
[ ] Metrics normal
[ ] Monitoring active
[ ] Documentation updated
[ ] Post-mortem scheduled
```

### Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-13 | 1.0.0 | Initial runbook | DevOps Team |

---

**End of Runbook**
