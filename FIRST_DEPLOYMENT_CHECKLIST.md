# First Production Deployment Checklist

Use this checklist for your first production deployment to ensure all prerequisites are met and the deployment goes smoothly.

**Print this page and check off each item as you complete it.**

---

## Pre-Deployment Setup (Complete Once)

### Environment Configuration

- [ ] Vercel account created and project set up
- [ ] Supabase project created and configured
- [ ] Production database is ready

### Environment Variables in Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set to production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set to production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set to production service role key
- [ ] `OPENAI_API_KEY` - Set to production OpenAI key
- [ ] `NEXT_PUBLIC_APP_VERSION` - Set to "1.0.0" or current version

### CI/CD Configuration (GitHub Secrets)

- [ ] `VERCEL_TOKEN` - Personal access token from Vercel
- [ ] `VERCEL_ORG_ID` - Your Vercel organization ID
- [ ] `VERCEL_PROJECT_ID` - Your project ID from Vercel
- [ ] `SUPABASE_URL` - Production Supabase URL
- [ ] `SUPABASE_ANON_KEY` - Production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Production service role key

### Monitoring Services Setup (Optional but Recommended)

- [ ] BetterUptime account created
  - [ ] Monitors configured (import from monitoring/uptime-config.json)
  - [ ] Status page created: https://status.foco.mx
  - [ ] Alert channels configured

- [ ] Sentry account created
  - [ ] Project created for production
  - [ ] DSN copied to `NEXT_PUBLIC_SENTRY_DSN` in Vercel
  - [ ] Alert rules configured

- [ ] Vercel Analytics enabled
  - [ ] Web Vitals tracking enabled
  - [ ] Custom metrics configured

- [ ] PagerDuty setup (Optional)
  - [ ] Service created
  - [ ] On-call schedule configured
  - [ ] Integration with Slack

### Team Preparation

- [ ] Team trained on deployment runbook
- [ ] On-call engineer identified
- [ ] Emergency contacts list updated
- [ ] Slack channels set up:
  - [ ] #incidents
  - [ ] #monitoring
  - [ ] #deployments
- [ ] Deployment window scheduled and communicated

### Local Setup Verification

- [ ] Node.js 18+ installed: `node --version`
- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Supabase CLI installed: `npm i -g supabase`
- [ ] Scripts are executable: `ls -la scripts/*.sh`
- [ ] All dependencies installed: `npm ci`

---

## Pre-Deployment Validation (Do Before Each Deployment)

### Code Quality

- [ ] All linting passes: `npm run lint`
- [ ] All unit tests pass: `npm run test:unit`
- [ ] All integration tests pass: `npm run test:integration`
- [ ] Type checking passes: `npm run type-check`
- [ ] Build completes successfully: `npm run build`
- [ ] Security audit passes: `npm audit --audit-level=high`

### Database Preparation

- [ ] Database migrations reviewed
- [ ] Migration tested in staging environment
- [ ] Backup capability verified
- [ ] Rollback procedure tested in staging

### Documentation Review

- [ ] Deployment runbook reviewed
- [ ] Team members know their roles
- [ ] Emergency procedures understood
- [ ] Contact information verified

### Final Checks

- [ ] All P0 issues resolved
- [ ] No open critical bugs
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Rollback plan documented and understood

---

## During Deployment

### Stage 1: Database Migration (30 minutes)

- [ ] Create database backup
- [ ] Apply migrations: `./scripts/database-migration-orchestrator.sh migrate`
- [ ] Verify migrations: `./scripts/database-migration-orchestrator.sh verify`
- [ ] Monitor for 15 minutes
  - [ ] No query failures observed
  - [ ] Response time normal (< 100ms avg)
  - [ ] Error rate < 0.1%
- [ ] Stage 1 complete and stable

### Stage 2: Security Fixes (30 minutes)

- [ ] Deploy to Vercel (automated or `vercel deploy --prod`)
- [ ] Wait for deployment to complete
- [ ] Verify health check: `curl https://foco.mx/api/health`
- [ ] MANUAL: Rotate credentials in Vercel dashboard
  - [ ] SUPABASE_SERVICE_ROLE_KEY rotated
  - [ ] OPENAI_API_KEY rotated (if needed)
  - [ ] Redeploy after rotation
- [ ] Run smoke tests: `npm run test:smoke -- --baseUrl=https://foco.mx`
- [ ] Monitor for 15 minutes
  - [ ] Authentication flows working
  - [ ] Rate limiting active
  - [ ] No security issues
- [ ] Stage 2 complete and stable

### Stage 3: Bug Fixes (45 minutes)

- [ ] Deploy to Vercel
- [ ] Verify health check
- [ ] Test specific bug fixes:
  - [ ] Task creation working
  - [ ] No schema errors
  - [ ] Organizations API responding
- [ ] Run comprehensive smoke tests
- [ ] Monitor for 30 minutes
  - [ ] Error rate < 0.1%
  - [ ] No user reports of issues
- [ ] Stage 3 complete and stable

### Stage 4: Performance Optimizations (1 hour 15 min)

- [ ] Deploy to Vercel
- [ ] Verify health check
- [ ] Run performance tests: `npm run test:performance -- --baseUrl=https://foco.mx`
- [ ] Monitor for 1 hour
  - [ ] Page load < 2s (p95)
  - [ ] API response < 100ms (avg)
  - [ ] Cache hit rate > 80%
  - [ ] No performance degradation
- [ ] Stage 4 complete and stable

### Stage 5: New Features - Beta (45 minutes)

- [ ] Deploy with feature flags enabled
- [ ] Verify health check
- [ ] Test new features:
  - [ ] Voice System accessible to beta users
  - [ ] CRICO features working
- [ ] Monitor for 30 minutes
  - [ ] No errors from new features
  - [ ] Beta users can access features
  - [ ] Feature usage metrics showing activity
- [ ] Stage 5 complete and stable

---

## Post-Deployment Verification

### Immediate Verification (Within 30 minutes)

- [ ] All smoke tests pass: `npm run test:smoke -- --baseUrl=https://foco.mx`
- [ ] P0 critical tests pass: `npm run test:smoke -- --grep "P0"`
- [ ] Health endpoint responding: `curl https://foco.mx/api/health`
- [ ] No critical errors in Sentry
- [ ] Response times normal in Vercel Analytics
- [ ] All deployment stages marked as successful

### Monitoring (First Hour)

- [ ] Error rate < 0.1% (check Sentry)
- [ ] Response time < 100ms average (check Vercel Analytics)
- [ ] Page load times < 2s p95 (check Vercel Analytics)
- [ ] Database performance normal (check Supabase dashboard)
- [ ] No user reports of issues
- [ ] Monitoring dashboards all green

### Communication

- [ ] Post deployment success to #deployments Slack channel
- [ ] Update status page if applicable
- [ ] Notify team of completion
- [ ] Document any issues encountered

---

## Post-Deployment Tasks

### Within 24 Hours

- [ ] Continue monitoring metrics every 2-4 hours
- [ ] Review error logs for any patterns
- [ ] Check user feedback channels
- [ ] Verify new features being used (if beta)
- [ ] Update deployment log with notes

### Within 1 Week

- [ ] Schedule post-mortem meeting
- [ ] Document lessons learned
- [ ] Update runbook if needed
- [ ] Plan rollout of beta features to all users
- [ ] Analyze deployment metrics
- [ ] Update this checklist based on experience

---

## Emergency Procedures

### If Deployment Fails

- [ ] Stay calm and assess the situation
- [ ] Check error logs in Vercel and Sentry
- [ ] Determine if rollback is needed
- [ ] If critical: Execute rollback immediately
  - [ ] `vercel rollback --token=$VERCEL_TOKEN --scope=$VERCEL_ORG_ID`
  - [ ] Verify application is healthy
- [ ] Notify team in #incidents
- [ ] Update status page
- [ ] Investigate root cause
- [ ] Fix issue and prepare for re-deployment

### Rollback Checklist

- [ ] Execute rollback command
- [ ] Wait for rollback to complete (2-5 minutes)
- [ ] Verify application health: `curl https://foco.mx/api/health`
- [ ] Run smoke tests to confirm stability
- [ ] Check error rates have normalized
- [ ] Notify team that rollback is complete
- [ ] Begin incident investigation
- [ ] Document what happened

---

## Success Criteria

Deployment is considered successful when ALL of these are true:

- [ ] All smoke tests pass (100% pass rate)
- [ ] Error rate < 0.1%
- [ ] Response time < 100ms (average)
- [ ] Page load < 2s (p95)
- [ ] Uptime > 99.9%
- [ ] No critical issues reported
- [ ] Monitoring shows green across all metrics
- [ ] Team confirms all features working as expected

---

## Notes and Observations

**Deployment Date**: _______________
**Deployment Time**: _______________
**Performed By**: _______________

**Issues Encountered**:
```
(Document any issues, even minor ones, for future reference)




```

**What Went Well**:
```
(Document what worked smoothly)




```

**Improvements for Next Time**:
```
(Ideas for improving the process)




```

---

## Sign-Off

- [ ] Deployment engineer confirms all checks complete
- [ ] On-call engineer briefed on deployment
- [ ] Team lead approves deployment success
- [ ] Documentation updated

**Deployment Status**: ⬜ SUCCESS  ⬜ PARTIAL  ⬜ ROLLED BACK

**Signatures**:
- Deployment Engineer: _______________
- On-Call Engineer: _______________
- Team Lead: _______________

---

**This checklist should be saved and archived after each deployment for historical records.**
