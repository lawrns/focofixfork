/**
 * CRICO Alignment Engine
 * Detects drift between UI, API, DB, specs, tests, and documentation
 */

import { supabase } from '@/lib/supabase/client';
import type {
  AlignmentAxis,
  AlignmentCheck,
  AlignmentMismatch,
  DriftSeverity,
} from '../types';

// ============================================================================
// ALIGNMENT CHECK TYPES
// ============================================================================

interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
}

interface SchemaDefinition {
  name: string;
  fields: SchemaField[];
  source: string;
}

interface AlignmentResult {
  aligned: boolean;
  severity: DriftSeverity;
  mismatches: AlignmentMismatch[];
  recommendations: string[];
  confidence: number;
}

// ============================================================================
// SCHEMA EXTRACTION
// ============================================================================

/**
 * Extract schema from database tables
 */
export async function extractDatabaseSchema(tableName: string): Promise<SchemaDefinition | null> {
  try {
    const { data, error } = await (supabase as any).rpc('get_table_columns', {
      p_table_name: tableName,
    });

    if (error) {
      // Fallback: query information_schema directly
      const { data: columns, error: colError } = await (supabase as any)
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName);

      if (colError || !columns) return null;

      return {
        name: tableName,
        fields: columns.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default,
        })),
        source: 'database',
      };
    }

    return {
      name: tableName,
      fields: data.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
      })),
      source: 'database',
    };
  } catch (error) {
    console.error('Failed to extract database schema:', error);
    return null;
  }
}

/**
 * Extract schema from TypeScript interface definition
 * This is a simplified version - a full implementation would use ts-morph or similar
 */
export function extractTypeScriptSchema(interfaceCode: string, name: string): SchemaDefinition {
  const fields: SchemaField[] = [];
  
  // Simple regex-based extraction (production would use AST)
  const fieldRegex = /(\w+)(\?)?:\s*(\w+(?:\[\])?)/g;
  let match;
  
  while ((match = fieldRegex.exec(interfaceCode)) !== null) {
    fields.push({
      name: match[1],
      type: match[3],
      nullable: match[2] === '?',
    });
  }

  return {
    name,
    fields,
    source: 'typescript',
  };
}

/**
 * Extract schema from API response/request definition
 */
export function extractAPISchema(openAPISpec: any, path: string, method: string): SchemaDefinition | null {
  try {
    const operation = openAPISpec.paths?.[path]?.[method];
    if (!operation) return null;

    const responseSchema = operation.responses?.['200']?.content?.['application/json']?.schema;
    if (!responseSchema) return null;

    const fields: SchemaField[] = [];
    
    if (responseSchema.properties) {
      for (const [name, prop] of Object.entries(responseSchema.properties)) {
        const propDef = prop as any;
        fields.push({
          name,
          type: propDef.type || 'unknown',
          nullable: !responseSchema.required?.includes(name),
        });
      }
    }

    return {
      name: `${method.toUpperCase()} ${path}`,
      fields,
      source: 'api',
    };
  } catch (error) {
    console.error('Failed to extract API schema:', error);
    return null;
  }
}

// ============================================================================
// ALIGNMENT COMPARISON
// ============================================================================

/**
 * Compare two schema definitions and find mismatches
 */
export function compareSchemas(
  source: SchemaDefinition,
  target: SchemaDefinition
): AlignmentMismatch[] {
  const mismatches: AlignmentMismatch[] = [];
  
  const sourceFields = new Map(source.fields.map(f => [f.name, f]));
  const targetFields = new Map(target.fields.map(f => [f.name, f]));

  // Check for missing fields in target
  for (const [name, field] of sourceFields) {
    if (!targetFields.has(name)) {
      mismatches.push({
        type: 'missing_field',
        source: source.source,
        target: target.source,
        expected: field,
        actual: null,
        severity: field.nullable ? 'medium' : 'high',
        suggestion: `Add field '${name}' to ${target.source}`,
      });
    }
  }

  // Check for extra fields in target
  for (const [name, field] of targetFields) {
    if (!sourceFields.has(name)) {
      mismatches.push({
        type: 'extra_field',
        source: source.source,
        target: target.source,
        expected: null,
        actual: field,
        severity: 'low',
        suggestion: `Field '${name}' in ${target.source} not in ${source.source}`,
      });
    }
  }

  // Check for type mismatches
  for (const [name, sourceField] of sourceFields) {
    const targetField = targetFields.get(name);
    if (targetField) {
      // Type comparison (simplified - would need type mapping)
      if (!areTypesCompatible(sourceField.type, targetField.type)) {
        mismatches.push({
          type: 'type_mismatch',
          source: source.source,
          target: target.source,
          expected: sourceField.type,
          actual: targetField.type,
          severity: 'high',
          suggestion: `Change '${name}' type from ${targetField.type} to ${sourceField.type}`,
        });
      }

      // Nullable mismatch
      if (sourceField.nullable !== targetField.nullable) {
        mismatches.push({
          type: 'nullable_mismatch',
          source: source.source,
          target: target.source,
          expected: sourceField.nullable,
          actual: targetField.nullable,
          severity: sourceField.nullable ? 'medium' : 'high',
          suggestion: `Field '${name}' nullable mismatch: ${source.source}=${sourceField.nullable}, ${target.source}=${targetField.nullable}`,
        });
      }
    }
  }

  return mismatches;
}

/**
 * Check if two types are compatible (simplified type mapping)
 */
function areTypesCompatible(dbType: string, tsType: string): boolean {
  const typeMap: Record<string, string[]> = {
    'integer': ['number', 'int', 'integer'],
    'bigint': ['number', 'bigint', 'string'],
    'text': ['string', 'text'],
    'varchar': ['string'],
    'character varying': ['string'],
    'boolean': ['boolean', 'bool'],
    'timestamp': ['Date', 'string', 'timestamp'],
    'timestamptz': ['Date', 'string'],
    'timestamp with time zone': ['Date', 'string'],
    'uuid': ['string', 'uuid'],
    'jsonb': ['object', 'Record', 'any', 'unknown'],
    'json': ['object', 'Record', 'any', 'unknown'],
    'numeric': ['number', 'decimal'],
    'decimal': ['number', 'decimal'],
    'real': ['number', 'float'],
    'double precision': ['number', 'float', 'double'],
  };

  const normalizedDb = dbType.toLowerCase();
  const normalizedTs = tsType.toLowerCase();

  // Direct match
  if (normalizedDb === normalizedTs) return true;

  // Check type mapping
  const compatibleTypes = typeMap[normalizedDb];
  if (compatibleTypes) {
    return compatibleTypes.some(t => normalizedTs.includes(t.toLowerCase()));
  }

  return false;
}

// ============================================================================
// ALIGNMENT CHECKS
// ============================================================================

/**
 * Check UI ↔ API ↔ DB alignment for a specific entity
 */
export async function checkUIAPIDBAlignment(
  entityName: string,
  dbTable: string,
  apiEndpoint?: string,
  uiFormFields?: string[]
): Promise<AlignmentResult> {
  const mismatches: AlignmentMismatch[] = [];
  const recommendations: string[] = [];

  // Get database schema
  const dbSchema = await extractDatabaseSchema(dbTable);
  if (!dbSchema) {
    return {
      aligned: false,
      severity: 'critical',
      mismatches: [{
        type: 'schema_unavailable',
        source: 'database',
        target: 'check',
        expected: 'schema',
        actual: null,
        severity: 'critical',
        suggestion: `Unable to read schema for table '${dbTable}'`,
      }],
      recommendations: ['Verify database table exists and is accessible'],
      confidence: 0.5,
    };
  }

  // If UI form fields provided, compare with DB
  if (uiFormFields && uiFormFields.length > 0) {
    const dbFieldNames = new Set(dbSchema.fields.map(f => f.name));
    
    for (const uiField of uiFormFields) {
      // Normalize field name (camelCase to snake_case)
      const normalizedField = uiField.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (!dbFieldNames.has(uiField) && !dbFieldNames.has(normalizedField)) {
        mismatches.push({
          type: 'ui_field_not_in_db',
          source: 'ui',
          target: 'database',
          expected: uiField,
          actual: null,
          severity: 'high',
          suggestion: `UI field '${uiField}' has no corresponding database column`,
        });
      }
    }
  }

  // Calculate severity
  let severity: DriftSeverity = 'info';
  if (mismatches.some(m => m.severity === 'critical')) severity = 'critical';
  else if (mismatches.some(m => m.severity === 'high')) severity = 'high';
  else if (mismatches.some(m => m.severity === 'medium')) severity = 'medium';
  else if (mismatches.some(m => m.severity === 'low')) severity = 'low';

  // Generate recommendations
  if (mismatches.length > 0) {
    recommendations.push(`Found ${mismatches.length} alignment issues for ${entityName}`);
    
    const typeIssues = mismatches.filter(m => m.type === 'type_mismatch').length;
    if (typeIssues > 0) {
      recommendations.push(`${typeIssues} type mismatches - regenerate TypeScript types from database`);
    }

    const missingFields = mismatches.filter(m => m.type === 'missing_field').length;
    if (missingFields > 0) {
      recommendations.push(`${missingFields} missing fields - update API/UI to match database schema`);
    }
  }

  return {
    aligned: mismatches.length === 0,
    severity,
    mismatches,
    recommendations,
    confidence: 0.85, // Static analysis is high confidence
  };
}

/**
 * Store alignment check result in database
 */
export async function saveAlignmentCheck(
  axis: AlignmentAxis,
  scope: string,
  result: AlignmentResult,
  userId?: string,
  agentInvocationId?: string
): Promise<string> {
  const { data, error } = await (supabase as any)
    .from('crico_alignment_checks')
    .insert({
      axis,
      scope,
      check_type: 'schema_comparison',
      aligned: result.aligned,
      drift_severity: result.severity,
      mismatches: result.mismatches,
      recommendations: result.recommendations,
      confidence: result.confidence,
      checked_at: new Date().toISOString(),
      user_id: userId,
      agent_invocation_id: agentInvocationId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save alignment check:', error);
    return '';
  }

  return data?.id ?? '';
}

/**
 * Get recent alignment checks for a scope
 */
export async function getRecentAlignmentChecks(
  scope: string,
  limit: number = 10
): Promise<AlignmentCheck[]> {
  const { data, error } = await (supabase as any)
    .from('crico_alignment_checks')
    .select('*')
    .eq('scope', scope)
    .order('checked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get alignment checks:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    axis: row.axis,
    scope: row.scope,
    checkType: row.check_type,
    sourceArtifact: row.source_artifact,
    targetArtifact: row.target_artifact,
    aligned: row.aligned,
    driftSeverity: row.drift_severity,
    mismatches: row.mismatches,
    recommendations: row.recommendations,
    confidence: row.confidence,
    checkedAt: new Date(row.checked_at),
    userId: row.user_id,
    agentInvocationId: row.agent_invocation_id,
  }));
}

// ============================================================================
// CONTINUOUS ALIGNMENT MONITORING
// ============================================================================

interface AlignmentMonitorConfig {
  entities: {
    name: string;
    dbTable: string;
    apiEndpoint?: string;
    uiFormFields?: string[];
  }[];
  checkInterval: number; // milliseconds
  onDriftDetected?: (result: AlignmentResult, entityName: string) => void;
}

/**
 * Start continuous alignment monitoring
 */
export function startAlignmentMonitor(config: AlignmentMonitorConfig): () => void {
  let running = true;

  const runChecks = async () => {
    while (running) {
      for (const entity of config.entities) {
        if (!running) break;

        const result = await checkUIAPIDBAlignment(
          entity.name,
          entity.dbTable,
          entity.apiEndpoint,
          entity.uiFormFields
        );

        if (!result.aligned && config.onDriftDetected) {
          config.onDriftDetected(result, entity.name);
        }

        // Save check result
        await saveAlignmentCheck('ui_api_db', entity.name, result);
      }

      // Wait for next check interval
      await new Promise(resolve => setTimeout(resolve, config.checkInterval));
    }
  };

  // Start monitoring in background
  runChecks().catch(console.error);

  // Return stop function
  return () => {
    running = false;
  };
}

// ============================================================================
// ALIGNMENT SCORE CALCULATION
// ============================================================================

/**
 * Calculate overall alignment score for a project
 */
export async function calculateAlignmentScore(projectId?: string): Promise<{
  score: number;
  breakdown: Record<AlignmentAxis, number>;
  totalChecks: number;
  alignedChecks: number;
}> {
  const { data, error } = await (supabase as any)
    .from('crico_alignment_checks')
    .select('axis, aligned, confidence')
    .order('checked_at', { ascending: false })
    .limit(100);

  if (error || !data || data.length === 0) {
    return {
      score: 1,
      breakdown: {
        ui_api_db: 1,
        spec_implementation: 1,
        test_behavior: 1,
        docs_reality: 1,
      },
      totalChecks: 0,
      alignedChecks: 0,
    };
  }

  const breakdown: Record<AlignmentAxis, { aligned: number; total: number }> = {
    ui_api_db: { aligned: 0, total: 0 },
    spec_implementation: { aligned: 0, total: 0 },
    test_behavior: { aligned: 0, total: 0 },
    docs_reality: { aligned: 0, total: 0 },
  };

  let totalAligned = 0;
  let totalChecks = 0;

  for (const check of data) {
    const axis = check.axis as AlignmentAxis;
    if (breakdown[axis]) {
      breakdown[axis].total++;
      if (check.aligned) {
        breakdown[axis].aligned++;
        totalAligned++;
      }
    }
    totalChecks++;
  }

  const axisScores: Record<AlignmentAxis, number> = {
    ui_api_db: breakdown.ui_api_db.total > 0 
      ? breakdown.ui_api_db.aligned / breakdown.ui_api_db.total 
      : 1,
    spec_implementation: breakdown.spec_implementation.total > 0 
      ? breakdown.spec_implementation.aligned / breakdown.spec_implementation.total 
      : 1,
    test_behavior: breakdown.test_behavior.total > 0 
      ? breakdown.test_behavior.aligned / breakdown.test_behavior.total 
      : 1,
    docs_reality: breakdown.docs_reality.total > 0 
      ? breakdown.docs_reality.aligned / breakdown.docs_reality.total 
      : 1,
  };

  const overallScore = totalChecks > 0 ? totalAligned / totalChecks : 1;

  return {
    score: overallScore,
    breakdown: axisScores,
    totalChecks,
    alignedChecks: totalAligned,
  };
}
