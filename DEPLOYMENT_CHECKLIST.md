# Deployment Checklist - Foco Consolidation

**Project:** Foco Codebase Consolidation
**Date:** 2026-01-08
**Status:** Ready for Deployment

---

## Pre-Deployment Verification

### Code Quality Checks ✅

- [x] **Build Status**
  ```bash
  npm run build
  ```
  - Result: ✅ Compiled successfully
  - 0 compilation errors
  - All TypeScript types valid

- [x] **Linting**
  ```bash
  npm run lint
  ```
  - Result: ✅ 0 errors (warnings only)
  - Pre-existing warnings documented
  - No new issues introduced

- [x] **Type Checking**
  ```bash
  npm run type-check
  ```
  - Result: ✅ All types valid
  - Service interfaces consistent
  - Import paths resolved

- [x] **Tests**
  ```bash
  npm test
  ```
  - Result: ✅ All tests passing
  - Unit tests: passing
  - Integration tests: passing
  - E2E tests: passing

### Documentation Review ✅

- [x] FINAL_CONSOLIDATION_REPORT.md created
- [x] DEPLOYMENT_CHECKLIST.md created (this file)
- [x] ARCHITECTURE_GUIDE.md created
- [x] CONSOLIDATION_SUMMARY.md exists
- [x] API_CONSOLIDATION_ROADMAP.md exists
- [x] README.md updated

### Security Verification ✅

- [x] No hardcoded credentials in codebase
- [x] Environment variables documented
- [x] Test credentials use env vars
- [x] Sensitive data properly handled
- [x] RLS policies reviewed

---

## Pre-Deployment Preparation

### Backup Strategy

**CRITICAL: Backup before any database changes**

#### 1. Database Backup

```bash
# Using Supabase CLI
supabase db dump -f backup_pre_consolidation_$(date +%Y%m%d).sql

# Or using pg_dump directly
pg_dump -h [SUPABASE_HOST] -U [USER] -d [DATABASE] > backup_$(date +%Y%m%d).sql
```

**Verification:**
- [ ] Backup file created
- [ ] Backup file size verified (> 0 bytes)
- [ ] Backup file readable
- [ ] Test restore in staging environment

#### 2. Code Backup

```bash
# Create deployment tag
git tag -a v1.0-pre-consolidation -m "Pre-consolidation stable state"
git push origin v1.0-pre-consolidation

# Verify tag
git tag -l
```

**Verification:**
- [ ] Git tag created
- [ ] Tag pushed to remote
- [ ] Tag contains correct commit

#### 3. Environment Configuration Backup

```bash
# Backup environment variables
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Document current configuration
env | grep -E "SUPABASE|NEXT_PUBLIC" > env_backup_$(date +%Y%m%d).txt
```

**Verification:**
- [ ] Environment file backed up
- [ ] Configuration documented

### Team Communication

- [ ] **Notify team** of deployment schedule
- [ ] **Schedule maintenance window** (if needed)
- [ ] **Prepare rollback plan** communication
- [ ] **Assign deployment roles:**
  - [ ] Deployment lead
  - [ ] Database admin
  - [ ] Monitoring lead
  - [ ] Communications lead

### Staging Environment Testing

- [ ] Deploy to staging environment
- [ ] Run full test suite in staging
- [ ] Verify critical user flows:
  - [ ] User login/authentication
  - [ ] Project creation
  - [ ] Task management
  - [ ] Organization management
  - [ ] Voice planning features
  - [ ] Analytics dashboard
- [ ] Performance testing in staging
- [ ] Load testing (if applicable)

---

## Deployment Procedure

### Phase 1: Code Deployment (No Database Changes)

**Estimated Time:** 15-30 minutes

#### Step 1: Deploy Consolidated Services

```bash
# Ensure all changes committed
git status

# Deploy to production
npm run build
npm run deploy  # or your deployment command

# Or if using Netlify
netlify deploy --prod
```

**Verification:**
- [ ] Deployment successful
- [ ] Build logs show no errors
- [ ] Application accessible
- [ ] Health check endpoint responding

#### Step 2: Verify Service Endpoints

**Test each canonical service:**

```bash
# Analytics service
curl https://[YOUR_DOMAIN]/api/analytics/dashboard

# Goals service
curl https://[YOUR_DOMAIN]/api/goals

# Export service
curl https://[YOUR_DOMAIN]/api/export/health
```

**Verification:**
- [ ] Analytics endpoints responding
- [ ] Goals endpoints responding
- [ ] Export endpoints responding
- [ ] No 500 errors in logs

#### Step 3: Verify API Routes

**Test consolidated API routes:**

```bash
# Organization routes (consolidated)
curl https://[YOUR_DOMAIN]/api/organizations

# Analytics (query-based)
curl https://[YOUR_DOMAIN]/api/analytics?type=dashboard

# AI routes (action-based)
curl https://[YOUR_DOMAIN]/api/ai?action=suggest
```

**Verification:**
- [ ] All new routes responding correctly
- [ ] Old routes show deprecation warnings (in headers)
- [ ] No broken imports
- [ ] Frontend loading correctly

#### Step 4: Monitor Error Rates

**Watch for 5-10 minutes:**

```bash
# Check application logs
netlify logs --prod  # or your logging command

# Monitor error rates in Supabase
# Check Supabase Dashboard > Logs
```

**Expected Results:**
- [ ] Error rate stable (no spike)
- [ ] Response times normal
- [ ] No new error patterns
- [ ] User sessions stable

### Phase 2: Database Migration (Optional - Can be delayed)

**⚠️ CRITICAL: Only proceed if Phase 1 is stable**

**Estimated Time:** 30-60 minutes

**Recommended:** Execute in dedicated maintenance window

#### Step 1: Final Backup

```bash
# Create final pre-migration backup
supabase db dump -f backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

**Verification:**
- [ ] Backup created
- [ ] Backup verified
- [ ] Backup stored securely

#### Step 2: Execute Migration in Staging

```bash
# Test migration in staging first
psql [STAGING_DB_URL] < database/migrations/999_consolidate_database_schema.sql
```

**Verification in Staging:**
- [ ] Migration completes without errors
- [ ] 22 core tables remain
- [ ] 47 tables successfully dropped
- [ ] Application still works in staging
- [ ] All core flows functional

#### Step 3: Execute Migration in Production

```bash
# Execute migration (ensure in transaction)
psql [PRODUCTION_DB_URL] < database/migrations/999_consolidate_database_schema.sql
```

**Monitor During Execution:**
- Watch for foreign key errors
- Monitor transaction progress
- Check for lock timeouts

**Verification:**
- [ ] Migration completes successfully
- [ ] No errors in migration log
- [ ] Expected table count (22 tables)
- [ ] No data loss in core tables

#### Step 4: Regenerate Database Types

```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id [PROJECT_ID] > src/lib/supabase/types.ts

# Commit updated types
git add src/lib/supabase/types.ts
git commit -m "Update database types after consolidation migration"
git push
```

**Verification:**
- [ ] Types generated successfully
- [ ] Type file smaller (~68% reduction expected)
- [ ] No type errors in build
- [ ] Application compiles

#### Step 5: Verify Core Functionality

**Test critical user flows:**

- [ ] User can log in
- [ ] User can create project
- [ ] User can create tasks
- [ ] User can create milestones
- [ ] User can use voice planning
- [ ] User can view activities
- [ ] Organization invites work
- [ ] Analytics dashboard loads

**Database Verification:**

```sql
-- Verify core tables exist
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: ~22 tables

-- Verify data integrity
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM users;
```

**Verification:**
- [ ] All core tables present
- [ ] Data counts match pre-migration
- [ ] No orphaned records
- [ ] Queries performing well

---

## Post-Deployment Validation

### Immediate Validation (0-2 hours)

#### Application Health

```bash
# Check health endpoint
curl https://[YOUR_DOMAIN]/api/health

# Check monitoring endpoint
curl https://[YOUR_DOMAIN]/api/monitoring?detailed=true
```

**Verification:**
- [ ] Health check passing
- [ ] All services responding
- [ ] Database connectivity good
- [ ] No error spikes

#### User Acceptance Testing

**Execute test scripts:**

```bash
# Run quick smoke tests
npm run test:smoke

# Run user journey tests
npm run test:e2e
```

**Manual Testing:**
- [ ] Login flow works
- [ ] Dashboard loads correctly
- [ ] Projects can be created
- [ ] Tasks can be managed
- [ ] Analytics displays correctly
- [ ] Voice planning functional

#### Performance Validation

**Monitor key metrics:**
- [ ] Page load times (should be stable or improved)
- [ ] API response times (should be stable or improved)
- [ ] Database query times (should improve with fewer tables)
- [ ] Error rates (should be stable)

### Extended Monitoring (2-24 hours)

#### Error Rate Monitoring

**Check logs every 2-4 hours:**

```bash
# Application logs
netlify logs --prod | grep -i error

# Supabase logs
# Check Supabase Dashboard > Logs
```

**Thresholds:**
- ✅ Error rate < 1% (normal)
- ⚠️ Error rate 1-5% (investigate)
- 🚨 Error rate > 5% (consider rollback)

**Track:**
- [ ] Hour 2: Error rate acceptable
- [ ] Hour 6: Error rate acceptable
- [ ] Hour 12: Error rate acceptable
- [ ] Hour 24: Error rate acceptable

#### Performance Monitoring

**Track metrics:**
- API response time average
- Database query latency
- Frontend page load time
- User session stability

**Expected Results:**
- [ ] Response times stable or improved
- [ ] Query latency reduced (fewer tables)
- [ ] Page load stable
- [ ] No user complaints

#### User Feedback Collection

- [ ] Monitor support channels
- [ ] Check for user-reported issues
- [ ] Review error reports
- [ ] Collect performance feedback

### Week 1 Monitoring (Days 2-7)

#### Daily Health Checks

**Each day:**
- [ ] Day 2: Review error logs and performance
- [ ] Day 3: Check user feedback
- [ ] Day 4: Monitor API usage patterns
- [ ] Day 5: Verify feature flag effectiveness
- [ ] Day 6: Review analytics data
- [ ] Day 7: Prepare Week 1 summary

#### Metrics to Track

**Application Metrics:**
- Error rate trend (should be stable)
- Response time trend (should be stable/improved)
- User session length (should be stable)
- Feature adoption (analytics dashboard, voice planning)

**Database Metrics:**
- Query performance (should be improved)
- Connection pool usage (should be stable)
- Storage usage (should be reduced)
- Backup completion (daily)

#### Success Criteria

**After 7 days, confirm:**
- [ ] Error rate normal (< 1%)
- [ ] No major user complaints
- [ ] Performance stable or improved
- [ ] All features functional
- [ ] Team confident in changes

---

## Rollback Procedures

### When to Rollback

**Rollback triggers:**
- 🚨 Error rate > 5% sustained for > 15 minutes
- 🚨 Critical feature completely broken
- 🚨 Data loss detected
- 🚨 Performance degradation > 50%
- 🚨 Security vulnerability discovered

### Code Rollback (Phase 1)

**If code deployment causes issues:**

```bash
# Revert to previous deployment
git revert [LAST_COMMIT_HASH]
git push

# Or rollback via deployment platform
netlify rollback  # or your platform command

# Or redeploy previous tag
git checkout v1.0-pre-consolidation
npm run build
npm run deploy
```

**Verification:**
- [ ] Previous version deployed
- [ ] Application functional
- [ ] Error rate normalized
- [ ] Team notified

**Estimated Time:** 5-10 minutes

### Database Rollback (Phase 2)

**⚠️ CRITICAL: Database rollback is complex**

**Option 1: Restore from Backup (Recommended)**

```bash
# Stop application
# Restore database from backup
psql [PRODUCTION_DB_URL] < backup_before_migration_[TIMESTAMP].sql

# Regenerate old types
npx supabase gen types typescript > src/lib/supabase/types.ts

# Redeploy previous code version
git checkout v1.0-pre-consolidation
npm run build
npm run deploy
```

**Estimated Time:** 30-60 minutes (includes downtime)

**Option 2: Reverse Migration (If tables empty)**

```sql
BEGIN;

-- Re-create deleted tables from schema backup
-- This requires having the CREATE TABLE statements saved

-- Example:
CREATE TABLE IF NOT EXISTS achievements (
    -- original schema here
);

-- Repeat for all 47 deleted tables

COMMIT;
```

**⚠️ Only use if:**
- Deleted tables had no data
- Migration was just executed (< 1 hour)
- No production data entered since migration

**Estimated Time:** 60-90 minutes

### Communication During Rollback

**Immediate:**
1. Notify team in Slack/communication channel
2. Update status page (if applicable)
3. Document issue and trigger
4. Assign incident lead

**Post-Rollback:**
1. Root cause analysis
2. Update deployment checklist
3. Plan remediation
4. Schedule retry (if applicable)

---

## Post-Deployment Cleanup

### Week 2: Remove Deprecated Routes

**After 1-2 weeks of stable operation:**

```bash
# Remove old API route patterns
rm -rf src/app/api/organization  # (keep organizations)
rm -rf src/app/api/settings      # (merged with /api/user)

# Remove deprecation warnings from code
# Update API documentation

# Commit changes
git add .
git commit -m "Remove deprecated API routes after consolidation"
git push
```

**Verification:**
- [ ] Old routes removed
- [ ] No broken imports
- [ ] API documentation updated
- [ ] Frontend still functional

### Ongoing: Maintain Documentation

**Monthly:**
- [ ] Review and update README.md
- [ ] Update architecture diagrams
- [ ] Document any new patterns
- [ ] Archive obsolete documentation

**Quarterly:**
- [ ] Review database for unused tables
- [ ] Check for duplicate code
- [ ] Evaluate feature flag usage
- [ ] Clean up test files

---

## Success Metrics

### Immediate Success Criteria (Day 1)

- [ ] Deployment completes without errors
- [ ] Application remains accessible
- [ ] Error rate < 1%
- [ ] All critical flows functional
- [ ] No data loss
- [ ] Performance stable

### Short-Term Success Criteria (Week 1)

- [ ] Sustained error rate < 1%
- [ ] No major user complaints
- [ ] Performance stable or improved
- [ ] Team comfortable with changes
- [ ] Documentation complete

### Long-Term Success Criteria (Month 1)

- [ ] Codebase maintainability improved
- [ ] Developer velocity increased
- [ ] Technical debt reduced
- [ ] System complexity reduced by ~70%
- [ ] Team adoption of new patterns

---

## Contact & Escalation

### Deployment Team

**Deployment Lead:** [Name]
- Responsibilities: Overall coordination, go/no-go decisions
- Contact: [Email/Slack]

**Database Administrator:** [Name]
- Responsibilities: Database migration, backup/restore
- Contact: [Email/Slack]

**Monitoring Lead:** [Name]
- Responsibilities: Error tracking, performance monitoring
- Contact: [Email/Slack]

**Communications Lead:** [Name]
- Responsibilities: Team/user communication, status updates
- Contact: [Email/Slack]

### Escalation Path

1. **Level 1:** Deployment team handles
2. **Level 2:** Notify engineering manager
3. **Level 3:** Notify CTO/VP Engineering
4. **Level 4:** Execute rollback

### Emergency Contacts

**Rollback Authority:** [Name, Contact]
**On-Call Engineer:** [Name, Contact]
**Database Admin (24/7):** [Name, Contact]

---

## Additional Resources

### Documentation

- [FINAL_CONSOLIDATION_REPORT.md](/Users/lukatenbosch/focofixfork/FINAL_CONSOLIDATION_REPORT.md) - Complete consolidation details
- [ARCHITECTURE_GUIDE.md](/Users/lukatenbosch/focofixfork/ARCHITECTURE_GUIDE.md) - New architecture overview
- [CONSOLIDATION_SUMMARY.md](/Users/lukatenbosch/focofixfork/CONSOLIDATION_SUMMARY.md) - Phase-by-phase summary
- [API_CONSOLIDATION_ROADMAP.md](/Users/lukatenbosch/focofixfork/API_CONSOLIDATION_ROADMAP.md) - API changes details
- [database/CONSOLIDATION_PLAN.md](/Users/lukatenbosch/focofixfork/database/CONSOLIDATION_PLAN.md) - Database migration details

### Monitoring Tools

- **Application Logs:** Netlify Dashboard > Logs
- **Database Logs:** Supabase Dashboard > Logs
- **Error Tracking:** [Your error tracking tool]
- **Performance:** [Your APM tool]
- **Uptime:** [Your uptime monitor]

### Support

- **Team Chat:** [Slack channel]
- **Issue Tracker:** [GitHub/Jira]
- **Documentation:** [Wiki/Confluence]
- **Runbooks:** [Location]

---

## Appendix: Quick Reference Commands

### Health Checks

```bash
# Application health
curl https://[YOUR_DOMAIN]/api/health

# Build check
npm run build

# Test check
npm test

# Lint check
npm run lint
```

### Database Commands

```bash
# Backup
supabase db dump -f backup_$(date +%Y%m%d).sql

# Restore
psql [DB_URL] < backup_[TIMESTAMP].sql

# Verify table count
psql [DB_URL] -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Generate types
npx supabase gen types typescript > src/lib/supabase/types.ts
```

### Deployment Commands

```bash
# Build for production
npm run build

# Deploy (Netlify)
netlify deploy --prod

# Rollback (Netlify)
netlify rollback

# Check deployment status
netlify status
```

### Git Commands

```bash
# Create backup tag
git tag -a v1.0-pre-consolidation -m "Pre-consolidation state"
git push origin v1.0-pre-consolidation

# Revert changes
git revert [COMMIT_HASH]

# Checkout previous version
git checkout [TAG_NAME]
```

---

**Checklist Version:** 1.0
**Last Updated:** 2026-01-08
**Status:** Ready for Use

**IMPORTANT:** Read this entire checklist before starting deployment. Ensure all team members understand their roles and responsibilities.

