# Database Architecture and Policies

## Overview

Foco uses Supabase PostgreSQL as its primary database with a hybrid security model combining Row Level Security (RLS) and application-layer authorization.

## Security Model

### Hybrid Approach

**Row Level Security (RLS)**: Enabled on newer tables (goals, time tracking, project members)
- Policies defined at database level
- Automatic enforcement on all queries
- Complex policy logic for multi-tenant data

**Application-Layer Security**: Used for core tables (projects, tasks, milestones)
- Authorization checked in API middleware
- More flexible permission models
- Easier to debug and modify

### Decision Criteria

Use **RLS** for:
- Complex multi-tenant relationships
- Frequently accessed data with simple permission rules
- Tables with many-to-many relationships

Use **Application-Layer** for:
- Complex business logic requirements
- Rapidly changing permission rules
- Tables requiring custom authorization logic

## Current Table Inventory

### Core Tables (Application-Layer Security)

| Table | Purpose | RLS Status | Authorization |
|-------|---------|------------|---------------|
| `projects` | Project definitions | ❌ Disabled | API middleware checks organization membership |
| `tasks` | Individual tasks | ❌ Disabled | Project membership validation |
| `milestones` | Project milestones | ❌ Disabled | Project ownership verification |

### Feature Tables (RLS Enabled)

| Table | Purpose | RLS Status | Policy Type |
|-------|---------|------------|-------------|
| `goals` | Goal tracking | ✅ Enabled | Organization-based access |
| `goal_milestones` | Goal milestones | ✅ Enabled | Goal ownership inheritance |
| `goal_project_links` | Goal-project relationships | ✅ Enabled | Goal access validation |
| `time_entries` | Time tracking | ✅ Enabled | User ownership + organization context |
| `project_members` | Project team assignments | ✅ Enabled | Project membership validation |

### System Tables

| Table | Purpose | RLS Status | Notes |
|-------|---------|------------|-------|
| `users` | User profiles | ❌ N/A | Supabase auth handles access |
| `organizations` | Organization data | ❌ Application | API middleware validation |
| `organization_members` | Team memberships | ✅ Enabled | Organization role-based access |

## RLS Policy Patterns

### Organization-Based Access

```sql
-- Goals table policy
CREATE POLICY "Users can view goals in their organization"
    ON goals FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );
```

### User Ownership

```sql
-- Time entries policy
CREATE POLICY "Users can view their own time entries"
    ON time_entries FOR SELECT
    USING (user_id = auth.uid());
```

### Role-Based Access

```sql
-- Organization members policy
CREATE POLICY "Organization owners can manage members"
    ON organization_members FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
```

## Migration History

### Sequential Migrations (001-014)

1. **001**: Add organization_id to user_profiles
2. **002**: Drop unused organization invites table
3. **003**: Create missing feature tables
4. **009**: Create goals tables with RLS policies
5. **010**: Create time tracking tables with RLS policies
6. **011**: Alter goals tables (schema updates)
7. **012**: Create project members table with RLS
8. **013**: Create activities table
9. **014**: Create tasks and milestones tables (application-layer security)

### Archived Experiments

Located in `database/archived/`:
- Failed RLS attempts and fixes
- Alternative security model explorations
- Temporary workarounds

These are kept for historical reference but are not part of the production migration sequence.

## Performance Considerations

### RLS Performance Impact

**Benefits:**
- Database-level filtering reduces data transfer
- Automatic policy enforcement
- Consistent security across all access patterns

**Costs:**
- Policy evaluation overhead on each query
- Complex policies can slow queries
- Harder to optimize with indexes

### Optimization Strategies

**Policy Indexing:**
```sql
-- Index for organization membership checks
CREATE INDEX idx_organization_members_user_org
ON organization_members(user_id, organization_id);

-- Index for goal organization access
CREATE INDEX idx_goals_organization_id
ON goals(organization_id);
```

**Query Optimization:**
- Use `EXPLAIN ANALYZE` to identify slow policy evaluations
- Consider policy caching for frequently accessed data
- Denormalize policy conditions where appropriate

## Backup and Recovery

### Backup Strategy

**Automated Backups:**
- Daily full backups via Supabase
- Point-in-time recovery available
- Encrypted backup storage

**Manual Exports:**
- Schema-only dumps for migration testing
- Data exports for analysis
- Configuration backups

### Recovery Procedures

**Data Loss Recovery:**
1. Identify affected tables and time range
2. Restore from point-in-time backup
3. Verify data integrity
4. Update application caches

**Schema Recovery:**
1. Restore schema from backup
2. Reapply migrations sequentially
3. Test all application functionality
4. Update documentation

## Development Guidelines

### Schema Changes

**Migration Process:**
1. Create migration file in `database/migrations/`
2. Test migration on development database
3. Update RLS policies if table structure changes
4. Test application functionality
5. Deploy to staging for integration testing

**Naming Conventions:**
- Tables: `snake_case`, plural nouns
- Columns: `snake_case`, descriptive names
- Indexes: `idx_table_column_purpose`
- Policies: `"Purpose of policy"`

### Policy Development

**Policy Testing:**
```sql
-- Test policy as specific user
SET LOCAL auth.uid = 'user-uuid-here';
SELECT * FROM goals; -- Should only return accessible goals
```

**Policy Documentation:**
- Document policy purpose and constraints
- Include examples of allowed/disallowed access
- Note performance implications

### Security Reviews

**Code Review Checklist:**
- [ ] RLS policies implement least privilege
- [ ] Policies handle all CRUD operations
- [ ] No direct table access bypasses policies
- [ ] Error messages don't leak sensitive information
- [ ] Policies are performant for common queries

## Troubleshooting

### Common Issues

**Policy Too Restrictive:**
- Symptoms: Legitimate queries fail
- Solution: Review policy conditions, check user permissions
- Prevention: Test policies with various user roles

**Policy Too Permissive:**
- Symptoms: Users access unauthorized data
- Solution: Tighten policy conditions
- Prevention: Security testing with different user contexts

**Performance Issues:**
- Symptoms: Slow queries with RLS enabled
- Solution: Add indexes, optimize policy conditions
- Prevention: Performance testing during development

### Debugging Tools

**Policy Analysis:**
```sql
-- View active policies
SELECT * FROM pg_policies WHERE tablename = 'goals';

-- Test policy evaluation
EXPLAIN ANALYZE SELECT * FROM goals WHERE organization_id = 'org-123';
```

**Access Logging:**
- Enable query logging in Supabase dashboard
- Monitor failed policy evaluations
- Track policy performance metrics

## Future Considerations

### Scalability

**Sharding Strategy:**
- Organization-based sharding for multi-tenant data
- Geographic distribution for global users
- Read replica optimization for analytics

**RLS Evolution:**
- Policy caching for improved performance
- Attribute-based access control (ABAC)
- Integration with external identity providers

### Compliance

**Data Privacy:**
- GDPR compliance for EU users
- Data retention policies
- Right to erasure implementation

**Audit Requirements:**
- Comprehensive access logging
- Change tracking for sensitive data
- Regular security assessments

### Technology Evolution

**Supabase Features:**
- Real-time RLS policy evaluation
- Advanced policy functions
- Integration with Supabase Auth

**Migration Paths:**
- Evaluate moving to application-layer only
- Consider microservice architecture
- Plan for database vendor migration if needed
