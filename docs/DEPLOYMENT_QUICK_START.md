# Deployment Quick Start Guide

## 🚀 Fast Track to Production

This guide provides the fastest path to deploying to production with all safety measures in place.

---

## Prerequisites

- Node.js 18+ installed
- Vercel CLI installed: `npm i -g vercel`
- Supabase CLI installed: `npm i -g supabase`
- Environment variables configured in Vercel dashboard
- Access to production credentials

---

## 5-Minute Setup

### 1. Verify Environment

```bash
# Check Node version
node --version  # Should be 18.x or 20.x

# Check installed CLIs
vercel --version
supabase --version

# Verify environment variables are set
export VERCEL_TOKEN="your-token"
export VERCEL_ORG_ID="your-org-id"
export VERCEL_PROJECT_ID="your-project-id"
```

### 2. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 3. Run Pre-Flight Checks

```bash
# Quick validation (2 minutes)
npm run lint
npm run test:unit
npm run build
```

---

## Deployment Options

### Option A: Automated Deployment (Recommended)

**Use GitHub Actions for fully automated staged deployment**

```bash
# Trigger deployment via GitHub Actions
# 1. Go to GitHub repository
# 2. Navigate to Actions tab
# 3. Select "Production Deployment Pipeline"
# 4. Click "Run workflow"
# 5. Select deployment stage: "all" for full deployment
# 6. Monitor progress in Actions tab
```

**Estimated Time**: 2-3 hours for complete staged rollout

---

### Option B: Manual Deployment with Scripts

**Use orchestration scripts for manual control**

#### Full Staged Deployment

```bash
# Complete deployment with all stages
./scripts/deploy-orchestration.sh all
```

#### Stage-by-Stage Deployment

```bash
# Stage 1: Database Migration (30 min)
./scripts/deploy-orchestration.sh database

# Stage 2: Security Fixes (30 min)
./scripts/deploy-orchestration.sh security

# Stage 3: Bug Fixes (45 min)
./scripts/deploy-orchestration.sh bugfix

# Stage 4: Performance (1 hour)
./scripts/deploy-orchestration.sh performance

# Stage 5: New Features (45 min)
./scripts/deploy-orchestration.sh features
```

**Estimated Time**: 3-4 hours for manual staged rollout

---

### Option C: Express Deployment (Emergency Only)

**⚠️ USE ONLY IN EMERGENCIES - Skips monitoring delays**

```bash
# Deploy directly to production
vercel deploy --prod

# Run smoke tests
npm run test:smoke -- --baseUrl=https://foco.mx

# Monitor closely for 30 minutes
```

**Estimated Time**: 10 minutes
**Risk**: High - No gradual rollout or extended monitoring

---

## Monitoring During Deployment

### Real-Time Health Checks

```bash
# In a separate terminal, run continuous health monitoring
watch -n 10 'curl -sf https://foco.mx/api/health | jq'
```

### Key Dashboards to Monitor

1. **Vercel Dashboard**: https://vercel.com/dashboard
   - Deployment status
   - Real-time logs
   - Analytics

2. **Supabase Dashboard**: https://app.supabase.com
   - Database metrics
   - Query performance
   - Connection pool

3. **Sentry Dashboard**: https://sentry.io
   - Error tracking
   - Performance monitoring
   - User impact

---

## Quick Rollback (If Needed)

### Instant Rollback (2 minutes)

```bash
# Rollback Vercel deployment immediately
vercel rollback --token=$VERCEL_TOKEN --scope=$VERCEL_ORG_ID --yes

# Verify application is healthy
curl https://foco.mx/api/health
```

### Database Rollback (5 minutes)

```bash
# Rollback database migrations
./scripts/database-migration-orchestrator.sh rollback

# Verify database integrity
./scripts/database-migration-orchestrator.sh verify
```

---

## Post-Deployment Checklist

```bash
# 1. Run comprehensive smoke tests
npm run test:smoke -- --baseUrl=https://foco.mx

# 2. Verify all P0 issues resolved
npm run test:smoke -- --grep "P0"

# 3. Check error rates (should be < 0.1%)
# Monitor in Sentry dashboard

# 4. Verify performance metrics
# Check Vercel Analytics dashboard

# 5. Update team
# Post in #deployments Slack channel
```

---

## Common Commands Reference

### Deployment

```bash
# Check deployment status
vercel inspect https://foco.mx

# View deployment logs
vercel logs --follow

# List recent deployments
vercel ls

# Promote specific deployment to production
vercel promote [deployment-url] --scope=$VERCEL_ORG_ID
```

### Database

```bash
# Create backup
./scripts/database-migration-orchestrator.sh backup

# Apply migrations
./scripts/database-migration-orchestrator.sh migrate

# Verify migrations
./scripts/database-migration-orchestrator.sh verify

# Rollback migrations
./scripts/database-migration-orchestrator.sh rollback
```

### Testing

```bash
# Smoke tests
npm run test:smoke

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# All tests
npm run test:comprehensive
```

### Monitoring

```bash
# Set up monitoring
./scripts/monitoring-setup.sh setup

# Verify monitoring
./scripts/monitoring-setup.sh verify

# Test alerts
./scripts/monitoring-setup.sh test
```

---

## Troubleshooting Quick Fixes

### Deployment Fails

```bash
# Check build logs
vercel logs

# Rebuild locally
npm run build

# Check for TypeScript errors
npm run type-check
```

### Health Check Fails

```bash
# Check Vercel logs
vercel logs

# Verify environment variables
vercel env ls

# Test database connection
npx supabase db ping
```

### High Error Rate

```bash
# Check Sentry for error patterns
# Rollback if critical
vercel rollback

# Or disable feature flags
# Update environment variables in Vercel dashboard
```

---

## Emergency Contacts

### On-Call
- Check PagerDuty schedule

### Slack Channels
- **Incidents**: #incidents
- **Monitoring**: #monitoring
- **Deployments**: #deployments

### External Services
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support

---

## Success Criteria

✅ **Deployment is successful when**:
- All smoke tests pass
- Error rate < 0.1%
- Response time < 100ms (average)
- Page load < 2s (p95)
- No critical issues reported
- Monitoring shows green across all metrics

---

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Keep eye on error rates
   - Watch for user reports
   - Check performance metrics

2. **Enable beta features for all users**
   - After successful 24-hour beta period
   - Update feature flags
   - Redeploy

3. **Schedule post-mortem**
   - Review what went well
   - Document issues encountered
   - Update runbook

4. **Update documentation**
   - Document any manual steps taken
   - Update troubleshooting guide
   - Share lessons learned

---

## Additional Resources

- **Full Runbook**: [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
- **GitHub Actions Workflow**: [.github/workflows/production-deployment.yml](../.github/workflows/production-deployment.yml)
- **Deployment Scripts**: [scripts/](../scripts/)
- **Smoke Tests**: [tests/smoke/](../tests/smoke/)

---

**Need Help?** Check the [full runbook](./DEPLOYMENT_RUNBOOK.md) or contact the on-call engineer via PagerDuty.
