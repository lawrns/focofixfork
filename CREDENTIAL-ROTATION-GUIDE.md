# 🚨 CRITICAL: Credential Rotation Guide

**Status:** IMMEDIATE ACTION REQUIRED
**Date:** 2026-01-13
**Severity:** P0 SECURITY BREACH

---

## Executive Summary

Production credentials were committed to git history in commit `ea9648e65152d219f38ae9646b77b6a97c709a34` and pushed to GitHub repository `https://github.com/lawrns/focofixfork.git`.

**IMMEDIATE ACTIONS REQUIRED:**
1. Rotate ALL exposed credentials (estimated time: 30-60 minutes)
2. Audit database for unauthorized access
3. Clean git history
4. Update deployment pipelines

---

## ⏱️ Timeline

- **T+0 (NOW):** Begin credential rotation
- **T+30min:** All credentials rotated and verified
- **T+1hr:** Git history cleaned
- **T+2hr:** Audit complete, monitoring in place
- **T+24hr:** Follow-up security review

---

## 🔐 Step 1: Rotate Supabase Service Role Key (10 minutes)

### Why This Is Critical
The service role key bypasses ALL Row Level Security (RLS) policies and grants full administrative access to the database.

### Steps

1. **Navigate to Supabase Dashboard**
   ```
   https://app.supabase.com/project/ouvqnyfqipgnrjnuqsqq/settings/api
   ```

2. **Reset Service Role Key**
   - Click "Settings" → "API"
   - Scroll to "Service role key"
   - Click "Reset service_role key"
   - Click "I understand, reset the service_role key"
   - **COPY THE NEW KEY IMMEDIATELY** (it won't be shown again)

3. **Update .env.local**
   ```bash
   cd /Users/lukatenbosch/focofixfork

   # Edit .env.local
   # Replace SUPABASE_SERVICE_ROLE_KEY with new value
   nano .env.local
   ```

4. **Update Vercel Environment Variables**
   ```bash
   # Option 1: Using Vercel CLI
   vercel env rm SUPABASE_SERVICE_ROLE_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   # Paste new key when prompted

   # Option 2: Using Vercel Dashboard
   # https://vercel.com/your-project/settings/environment-variables
   # Edit SUPABASE_SERVICE_ROLE_KEY for Production, Preview, Development
   ```

5. **Redeploy Application**
   ```bash
   # Trigger redeployment to pick up new environment variables
   vercel --prod

   # Or via dashboard: Deployments → Latest → Redeploy
   ```

6. **Verify New Key Works**
   ```bash
   # Test API endpoint that uses service role
   curl -X GET https://your-app.vercel.app/api/health \
     -H "Authorization: Bearer $(supabase auth token)"

   # Should return 200 OK
   ```

7. **Confirm Old Key Is Invalid**
   ```bash
   # Try using old key - should fail
   # This confirms rotation was successful
   ```

---

## 🗄️ Step 2: Rotate Database Password (10 minutes)

### Why This Is Critical
Database password was exposed in connection string. Direct database access bypasses application security.

### Steps

1. **Navigate to Database Settings**
   ```
   https://app.supabase.com/project/ouvqnyfqipgnrjnuqsqq/settings/database
   ```

2. **Reset Database Password**
   - Click "Settings" → "Database"
   - Scroll to "Database Password"
   - Click "Reset database password"
   - Enter new strong password (min 20 chars, mix of upper/lower/numbers/symbols)
   - Click "Reset password"
   - **SAVE THE NEW PASSWORD SECURELY**

3. **Update DATABASE_URL**
   ```bash
   # New format:
   # postgresql://postgres:NEW_PASSWORD@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres

   # Edit .env.local
   nano .env.local
   # Update DATABASE_URL with new password
   ```

4. **Update Vercel Environment Variables**
   ```bash
   vercel env rm DATABASE_URL production
   vercel env add DATABASE_URL production
   # Paste new connection string
   ```

5. **Update Any Database Clients**
   ```bash
   # If using pgAdmin, DataGrip, or other tools:
   # Update connection settings with new password
   ```

6. **Verify Database Connectivity**
   ```bash
   # Test connection
   psql "postgresql://postgres:NEW_PASSWORD@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres" \
     -c "SELECT 1;"

   # Should return: 1
   ```

---

## 🤖 Step 3: Rotate DeepSeek API Key (5 minutes)

### Why This Is Critical
Exposed API key can be used for unauthorized AI requests, causing cost overruns.

### Steps

1. **Navigate to DeepSeek Dashboard**
   ```
   https://platform.deepseek.com/api_keys
   ```

2. **Revoke Old Key**
   - Find key: `sk-7c27863ac0cc4105999c690b7ee58b8f`
   - Click "Revoke" or "Delete"
   - Confirm revocation

3. **Generate New API Key**
   - Click "Create new API key"
   - Name: "Foco Production (Rotated 2026-01-13)"
   - Click "Create"
   - **COPY THE NEW KEY IMMEDIATELY**

4. **Update .env.local**
   ```bash
   nano .env.local
   # Replace DEEPSEEK_API_KEY with new value
   ```

5. **Update Vercel Environment Variables**
   ```bash
   vercel env rm DEEPSEEK_API_KEY production
   vercel env add DEEPSEEK_API_KEY production
   # Paste new key
   ```

6. **Redeploy and Test**
   ```bash
   vercel --prod

   # Test AI endpoint
   curl -X POST https://your-app.vercel.app/api/crico/voice \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TEST_TOKEN" \
     -d '{"audio":"test","format":"webm"}'

   # Should return 200 OK or appropriate response
   ```

7. **Monitor DeepSeek Usage**
   - Check usage dashboard for any unexpected spikes
   - Set up usage alerts if available

---

## 🔍 Step 4: Audit Database Access (20 minutes)

### Check for Unauthorized Access

1. **Review Recent Database Connections**
   ```sql
   -- Connect to database
   psql "postgresql://postgres:NEW_PASSWORD@db.ouvqnyfqipgnrjnuqsqq.supabase.co:5432/postgres"

   -- Check for suspicious connections (if logs available)
   SELECT * FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY backend_start DESC;
   ```

2. **Check for Unauthorized User Accounts**
   ```sql
   -- List all users created in last 30 days
   SELECT id, email, created_at, last_sign_in_at, is_sso_user
   FROM auth.users
   WHERE created_at > NOW() - INTERVAL '30 days'
   ORDER BY created_at DESC;

   -- Look for suspicious emails or patterns
   ```

3. **Check for Data Modifications**
   ```sql
   -- Check recent workspace creations
   SELECT id, name, created_at
   FROM workspaces
   WHERE created_at > NOW() - INTERVAL '7 days'
   ORDER BY created_at DESC;

   -- Check for bulk deletions or updates
   SELECT id, name, deleted_at, updated_at
   FROM workspaces
   WHERE deleted_at IS NOT NULL
   OR updated_at > NOW() - INTERVAL '7 days'
   ORDER BY updated_at DESC;
   ```

4. **Review Workspace Memberships**
   ```sql
   -- Check for unauthorized access grants
   SELECT wm.*, u.email, w.name as workspace_name
   FROM workspace_members wm
   JOIN auth.users u ON u.id = wm.user_id
   JOIN workspaces w ON w.id = wm.workspace_id
   WHERE wm.created_at > NOW() - INTERVAL '7 days'
   ORDER BY wm.created_at DESC;
   ```

5. **Check DeepSeek Usage Logs**
   - Log into DeepSeek dashboard
   - Check API usage for suspicious spikes
   - Look for unusual request patterns or high volume

### Document Findings

```bash
# Create incident report
cat > /Users/lukatenbosch/focofixfork/SECURITY-INCIDENT-REPORT.md << 'EOF'
# Security Incident Report - Credential Exposure

Date: 2026-01-13
Reporter: [Your Name]
Status: Under Investigation

## Timeline
- 2026-01-11: Credentials committed to git
- 2026-01-13: Breach discovered
- 2026-01-13: Credentials rotated

## Findings
- [ ] No unauthorized user accounts found
- [ ] No suspicious database modifications
- [ ] No unusual API usage patterns
- [ ] No evidence of data exfiltration

## Actions Taken
1. All credentials rotated
2. Database audited
3. Monitoring enhanced
4. Team notified

## Follow-up Actions
1. Implement secrets scanning
2. Add pre-commit hooks
3. Security training for team
4. Quarterly security audits
EOF
```

---

## 🧹 Step 5: Clean Git History (30 minutes)

### ⚠️ WARNING
This operation is **DESTRUCTIVE** and will rewrite git history. Coordinate with all team members before proceeding.

### Option A: BFG Repo-Cleaner (Recommended)

```bash
# 1. Install BFG
brew install bfg

# 2. Create backup
cd /Users/lukatenbosch
git clone --mirror https://github.com/lawrns/focofixfork.git focofixfork-backup.git

# 3. Clone repository
git clone https://github.com/lawrns/focofixfork.git focofixfork-clean
cd focofixfork-clean

# 4. Run BFG to remove .env.local from history
bfg --delete-files .env.local

# 5. Clean reflog and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Verify .env.local is gone from history
git log --all --full-history -- .env.local
# Should return nothing

# 7. Force push (coordinate with team!)
git push origin --force --all
git push origin --force --tags
```

### Option B: Git Filter-Repo

```bash
# 1. Install git-filter-repo
pip3 install git-filter-repo

# 2. Create backup
git clone https://github.com/lawrns/focofixfork.git focofixfork-backup

# 3. Clone fresh copy
git clone https://github.com/lawrns/focofixfork.git focofixfork-clean
cd focofixfork-clean

# 4. Remove .env.local from history
git filter-repo --invert-paths --path .env.local

# 5. Add remote back (filter-repo removes it)
git remote add origin https://github.com/lawrns/focofixfork.git

# 6. Force push
git push origin --force --all
git push origin --force --tags
```

### Post-Cleanup

1. **Notify All Team Members**
   ```
   Subject: URGENT - Git Repository History Rewritten

   The git repository history has been rewritten to remove exposed credentials.

   ACTION REQUIRED:
   1. Delete your local clone: rm -rf focofixfork
   2. Re-clone repository: git clone https://github.com/lawrns/focofixfork.git
   3. Update .env.local with new credentials (see team chat)

   Do NOT push from old clones - this will re-introduce the breach.
   ```

2. **Update CI/CD Pipelines**
   ```bash
   # If using GitHub Actions, Vercel, or other CI:
   # They may cache old repository state
   # Trigger fresh builds after history cleanup
   ```

3. **Verify Credentials Are Gone**
   ```bash
   git log --all --full-history --source -- .env.local
   # Should return empty

   git grep -i "7c27863ac0cc4105999c690b7ee58b8f"
   # Should return nothing
   ```

---

## 📊 Step 6: Implement Monitoring (15 minutes)

### Set Up Security Alerts

1. **Supabase Dashboard Alerts**
   - Enable authentication failure alerts
   - Set up unusual activity notifications
   - Configure connection threshold alerts

2. **DeepSeek Usage Alerts**
   - Set budget alerts
   - Enable usage spike notifications

3. **Application Logging**
   ```typescript
   // Already implemented in:
   // - src/lib/middleware/workspace-isolation.ts
   // - src/lib/middleware/enhanced-rate-limit.ts

   // Verify logs are being captured
   // Check for security events in logs
   ```

4. **GitHub Security**
   ```bash
   # Enable secret scanning
   # Go to: Settings → Security → Code security and analysis
   # Enable: Dependency graph, Dependabot alerts, Secret scanning
   ```

---

## ✅ Verification Checklist

### Credential Rotation Complete
- [ ] New Supabase service role key generated
- [ ] New database password set
- [ ] New DeepSeek API key created
- [ ] All old credentials revoked/invalid
- [ ] .env.local updated with new credentials
- [ ] Vercel environment variables updated
- [ ] Application redeployed successfully
- [ ] All endpoints tested and working
- [ ] Old credentials verified non-functional

### Security Audit Complete
- [ ] Database access logs reviewed
- [ ] No unauthorized users found
- [ ] No suspicious data modifications
- [ ] No unusual API usage detected
- [ ] Incident report documented
- [ ] Team notified of breach

### Git History Cleaned
- [ ] Backup created
- [ ] .env.local removed from history
- [ ] Force push completed
- [ ] Team members notified to re-clone
- [ ] CI/CD pipelines updated
- [ ] Verified credentials not in history

### Monitoring Implemented
- [ ] Supabase alerts configured
- [ ] DeepSeek usage monitoring enabled
- [ ] Application security logging verified
- [ ] GitHub secret scanning enabled
- [ ] Incident response plan created

---

## 🔒 Prevention Measures

### Immediate (Do Today)

1. **Add Pre-commit Hook**
   ```bash
   # Install detect-secrets
   pip3 install detect-secrets

   # Create pre-commit hook
   cat > .git/hooks/pre-commit << 'EOF'
   #!/bin/bash
   detect-secrets scan --baseline .secrets.baseline
   if [ $? -ne 0 ]; then
     echo "❌ BLOCKED: Potential secrets detected!"
     echo "Run: detect-secrets audit .secrets.baseline"
     exit 1
   fi
   EOF

   chmod +x .git/hooks/pre-commit

   # Initialize baseline
   detect-secrets scan > .secrets.baseline
   ```

2. **Update .gitignore**
   ```bash
   # Ensure .env.local is ignored (already is, but verify)
   grep ".env.local" .gitignore

   # Add additional patterns
   cat >> .gitignore << 'EOF'

   # Credentials and secrets
   *.key
   *.pem
   *.p12
   credentials.json
   secrets.json
   EOF
   ```

3. **Enable GitHub Secret Scanning**
   - Repository Settings → Security → Enable secret scanning
   - Enable push protection

### Short-term (This Week)

1. **Implement Secrets Management**
   ```bash
   # Consider using:
   # - Vercel Environment Variables (already using)
   # - HashiCorp Vault
   # - AWS Secrets Manager
   # - 1Password Secrets Automation
   ```

2. **Set Up Automated Rotation**
   ```bash
   # Create rotation schedule:
   # - Supabase keys: Every 90 days
   # - Database password: Every 90 days
   # - API keys: Every 90 days

   # Set calendar reminders
   ```

3. **Security Training**
   - Schedule team security training
   - Review secure coding practices
   - Establish credential handling policies

### Long-term (This Month)

1. **Implement Secrets Scanning in CI**
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on: [push, pull_request]
   jobs:
     secrets:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Scan for secrets
           uses: trufflesecurity/trufflehog@main
   ```

2. **Quarterly Security Audits**
   - Schedule regular security reviews
   - Penetration testing
   - Dependency updates

3. **Incident Response Plan**
   - Document breach procedures
   - Create contact list
   - Establish escalation process

---

## 📞 Emergency Contacts

- **Security Lead:** [Your contact]
- **Infrastructure Lead:** [Your contact]
- **Supabase Support:** support@supabase.com
- **DeepSeek Support:** [Support contact]
- **GitHub Support:** support@github.com

---

## 📚 References

- [OWASP Credential Management](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/04-Testing_for_Weak_Encryption.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Git History Rewriting](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
- [Detecting Secrets in Code](https://github.com/Yelp/detect-secrets)

---

**Last Updated:** 2026-01-13
**Next Review:** 2026-01-20
**Version:** 1.0
