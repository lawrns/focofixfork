/**
 * CRICO Schema Alignment Checker
 * Detects UI ↔ API ↔ DB drift in real-time
 *
 * Core alignment detection for the "column does not exist" class of bugs
 * Implements Section 2.3 and Section 6.2 of the CRICO Master Plan
 */

import { supabase } from '@/lib/supabase/client';
import type { AlignmentMismatch, DriftSeverity } from '../types';

// ============================================================================
// SCHEMA TYPES
// ============================================================================

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

export interface SchemaDefinition {
  name: string;
  fields: SchemaField[];
  source: 'database' | 'typescript' | 'api' | 'ui' | 'migration';
  version?: string;
  lastModified?: Date;
}

export interface AlignmentCheckResult {
  aligned: boolean;
  severity: DriftSeverity;
  mismatches: AlignmentMismatch[];
  recommendations: string[];
  confidence: number;
  timestamp: Date;
  checksPerformed: string[];
}

export interface SchemaAlignmentConfig {
  strictMode: boolean;
  ignoredFields: string[];
  customTypeMapping: Record<string, string[]>;
  severityOverrides: Record<string, DriftSeverity>;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SchemaAlignmentConfig = {
  strictMode: false,
  ignoredFields: ['id', 'created_at', 'updated_at'],
  customTypeMapping: {},
  severityOverrides: {},
};

// ============================================================================
// TYPE MAPPING (PostgreSQL ↔ TypeScript)
// ============================================================================

const POSTGRES_TO_TS_MAP: Record<string, string[]> = {
  // Numeric types
  'integer': ['number', 'int', 'integer'],
  'int4': ['number', 'int', 'integer'],
  'bigint': ['number', 'bigint', 'string'],
  'int8': ['number', 'bigint', 'string'],
  'smallint': ['number', 'int', 'integer'],
  'int2': ['number', 'int', 'integer'],
  'numeric': ['number', 'decimal', 'string'],
  'decimal': ['number', 'decimal', 'string'],
  'real': ['number', 'float'],
  'float4': ['number', 'float'],
  'double precision': ['number', 'float', 'double'],
  'float8': ['number', 'float', 'double'],

  // String types
  'text': ['string', 'text'],
  'varchar': ['string'],
  'character varying': ['string'],
  'char': ['string'],
  'character': ['string'],
  'name': ['string'],

  // Boolean
  'boolean': ['boolean', 'bool'],
  'bool': ['boolean', 'bool'],

  // Date/Time types
  'timestamp': ['Date', 'string', 'timestamp'],
  'timestamptz': ['Date', 'string'],
  'timestamp with time zone': ['Date', 'string'],
  'timestamp without time zone': ['Date', 'string'],
  'date': ['Date', 'string'],
  'time': ['string'],
  'time with time zone': ['string'],
  'time without time zone': ['string'],
  'interval': ['string', 'object'],

  // UUID
  'uuid': ['string', 'uuid'],

  // JSON types
  'jsonb': ['object', 'Record', 'any', 'unknown', 'JsonValue'],
  'json': ['object', 'Record', 'any', 'unknown', 'JsonValue'],

  // Array types (simplified)
  'array': ['Array', 'any[]'],
  'text[]': ['string[]'],
  'integer[]': ['number[]'],
  'uuid[]': ['string[]'],

  // Binary
  'bytea': ['Uint8Array', 'Buffer', 'string'],

  // Network types
  'inet': ['string'],
  'cidr': ['string'],
  'macaddr': ['string'],

  // Geometric types
  'point': ['object', 'string'],
  'line': ['object', 'string'],
  'box': ['object', 'string'],
  'circle': ['object', 'string'],
};

// ============================================================================
// SCHEMA EXTRACTION
// ============================================================================

/**
 * Extract schema from database table using information_schema
 */
export async function extractDatabaseSchema(
  tableName: string,
  schemaName: string = 'public'
): Promise<SchemaDefinition | null> {
  try {
    // Try RPC function first (more efficient)
    const { data: rpcData, error: rpcError } = await (supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
    }).rpc('get_table_columns', {
      p_table_name: tableName,
      p_schema_name: schemaName,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      return {
        name: tableName,
        fields: rpcData.map((col: Record<string, unknown>) => ({
          name: col.column_name as string,
          type: col.data_type as string,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default,
          isPrimaryKey: col.is_primary_key === true,
          isForeignKey: col.is_foreign_key === true,
          references: col.references ? col.references as { table: string; column: string } : undefined,
        })),
        source: 'database',
        lastModified: new Date(),
      };
    }

    // Fallback: direct query to information_schema
    const query = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.udt_name,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND ku.table_name = $1
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT kcu.column_name, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = $1
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `;

    // Use a simpler approach with Supabase
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<{ data: unknown[] | null; error: Error | null }>;
          };
        };
      };
    }).from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default, udt_name')
      .eq('table_name', tableName)
      .eq('table_schema', schemaName);

    if (error || !data) {
      console.error('Failed to extract database schema:', error);
      return null;
    }

    return {
      name: tableName,
      fields: (data as Record<string, unknown>[]).map((col) => ({
        name: col.column_name as string,
        type: col.data_type as string,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
      })),
      source: 'database',
      lastModified: new Date(),
    };
  } catch (error) {
    console.error('Failed to extract database schema:', error);
    return null;
  }
}

/**
 * Extract schema from TypeScript interface using AST parsing
 * Production implementation would use ts-morph for full AST support
 */
export function extractTypeScriptSchema(
  interfaceCode: string,
  interfaceName: string
): SchemaDefinition {
  const fields: SchemaField[] = [];

  // Enhanced regex pattern for TypeScript interface parsing
  const patterns = [
    // Standard property: name: type;
    /(\w+)(\?)?:\s*([^;,}]+)/g,
    // Readonly property: readonly name: type;
    /readonly\s+(\w+)(\?)?:\s*([^;,}]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(interfaceCode)) !== null) {
      const name = match[1];
      const optional = match[2] === '?';
      let type = match[3].trim();

      // Clean up type annotations
      type = type.replace(/\/\*.*?\*\//g, '').trim();
      type = type.replace(/\/\/.*$/gm, '').trim();

      // Handle union types with null/undefined
      const isNullable = optional ||
        type.includes('| null') ||
        type.includes('| undefined') ||
        type.includes('null |') ||
        type.includes('undefined |');

      // Clean up nullable markers from type
      type = type
        .replace(/\|\s*null/g, '')
        .replace(/\|\s*undefined/g, '')
        .replace(/null\s*\|/g, '')
        .replace(/undefined\s*\|/g, '')
        .trim();

      // Handle array types
      if (type.endsWith('[]')) {
        type = `Array<${type.slice(0, -2)}>`;
      }

      fields.push({
        name,
        type,
        nullable: isNullable,
      });
    }
  }

  return {
    name: interfaceName,
    fields,
    source: 'typescript',
    lastModified: new Date(),
  };
}

/**
 * Extract schema from OpenAPI specification
 */
export function extractAPISchema(
  openAPISpec: Record<string, unknown>,
  path: string,
  method: string
): SchemaDefinition | null {
  try {
    const paths = openAPISpec.paths as Record<string, Record<string, unknown>> | undefined;
    if (!paths) return null;

    const pathSpec = paths[path];
    if (!pathSpec) return null;

    const operation = pathSpec[method.toLowerCase()] as Record<string, unknown> | undefined;
    if (!operation) return null;

    // Get response schema
    const responses = operation.responses as Record<string, unknown> | undefined;
    if (!responses) return null;

    const successResponse = (responses['200'] || responses['201']) as Record<string, unknown> | undefined;
    if (!successResponse) return null;

    const content = successResponse.content as Record<string, unknown> | undefined;
    if (!content) return null;

    const jsonContent = content['application/json'] as Record<string, unknown> | undefined;
    if (!jsonContent) return null;

    const responseSchema = jsonContent.schema as Record<string, unknown> | undefined;
    if (!responseSchema) return null;

    const fields: SchemaField[] = [];
    const properties = responseSchema.properties as Record<string, unknown> | undefined;
    const required = responseSchema.required as string[] | undefined;

    if (properties) {
      for (const [name, prop] of Object.entries(properties)) {
        const propDef = prop as Record<string, unknown>;
        fields.push({
          name,
          type: (propDef.type as string) || 'unknown',
          nullable: !required?.includes(name),
          enumValues: propDef.enum as string[] | undefined,
        });
      }
    }

    return {
      name: `${method.toUpperCase()} ${path}`,
      fields,
      source: 'api',
      lastModified: new Date(),
    };
  } catch (error) {
    console.error('Failed to extract API schema:', error);
    return null;
  }
}

/**
 * Extract schema from React form/component props
 * This is a simplified version - production would use AST analysis
 */
export function extractUISchema(
  componentCode: string,
  componentName: string
): SchemaDefinition {
  const fields: SchemaField[] = [];

  // Look for form field patterns in JSX
  const patterns = [
    // name="fieldName" or name={'fieldName'}
    /name=["'{]([^"'}]+)["'}]/g,
    // id="fieldId"
    /id=["']([^"']+)["']/g,
    // FormField name
    /<FormField[^>]*name=["'{]([^"'}]+)["'}]/g,
    // Input components with field props
    /<(?:Input|Select|TextArea|Checkbox)[^>]*\s+(?:name|field)=["'{]([^"'}]+)["'}]/g,
  ];

  const seenFields = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(componentCode)) !== null) {
      const fieldName = match[1];
      if (!seenFields.has(fieldName)) {
        seenFields.add(fieldName);
        fields.push({
          name: fieldName,
          type: 'unknown', // Would need type inference
          nullable: true, // Default to nullable for UI fields
        });
      }
    }
  }

  return {
    name: componentName,
    fields,
    source: 'ui',
    lastModified: new Date(),
  };
}

/**
 * Extract schema from SQL migration file
 */
export function extractMigrationSchema(
  migrationSQL: string,
  tableName: string
): SchemaDefinition | null {
  const fields: SchemaField[] = [];

  // Find CREATE TABLE statement for the specific table
  const createTableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:\\w+\\.)?${tableName}\\s*\\(([^)]+)\\)`,
    'is'
  );

  const match = createTableRegex.exec(migrationSQL);
  if (!match) return null;

  const columnsSection = match[1];

  // Parse column definitions
  const columnRegex = /(\w+)\s+([\w\s()]+?)(?:\s+(?:NOT\s+)?NULL)?(?:\s+DEFAULT\s+([^,]+))?(?:\s+(?:PRIMARY\s+KEY|REFERENCES|UNIQUE|CHECK))?/gi;

  let colMatch;
  while ((colMatch = columnRegex.exec(columnsSection)) !== null) {
    const name = colMatch[1].toLowerCase();
    const typeString = colMatch[2].trim().toLowerCase();
    const defaultValue = colMatch[3];

    // Skip constraints that aren't columns
    if (['primary', 'foreign', 'unique', 'check', 'constraint'].includes(name)) {
      continue;
    }

    // Determine nullability
    const fullDef = colMatch[0].toUpperCase();
    const nullable = !fullDef.includes('NOT NULL') && !fullDef.includes('PRIMARY KEY');

    fields.push({
      name,
      type: typeString,
      nullable,
      defaultValue: defaultValue?.trim(),
      isPrimaryKey: fullDef.includes('PRIMARY KEY'),
    });
  }

  return {
    name: tableName,
    fields,
    source: 'migration',
    lastModified: new Date(),
  };
}

// ============================================================================
// TYPE COMPATIBILITY CHECKING
// ============================================================================

/**
 * Check if two types are compatible
 */
export function areTypesCompatible(
  sourceType: string,
  targetType: string,
  config: SchemaAlignmentConfig = DEFAULT_CONFIG
): boolean {
  const normalizedSource = normalizeType(sourceType);
  const normalizedTarget = normalizeType(targetType);

  // Direct match
  if (normalizedSource === normalizedTarget) return true;

  // Check custom mappings first
  if (config.customTypeMapping[normalizedSource]) {
    if (config.customTypeMapping[normalizedSource].some(
      t => normalizeType(t) === normalizedTarget
    )) {
      return true;
    }
  }

  // Check default PostgreSQL to TypeScript mapping
  const compatibleTypes = POSTGRES_TO_TS_MAP[normalizedSource];
  if (compatibleTypes) {
    return compatibleTypes.some(t => normalizeType(t) === normalizedTarget);
  }

  // Check reverse mapping (TypeScript to PostgreSQL)
  for (const [pgType, tsTypes] of Object.entries(POSTGRES_TO_TS_MAP)) {
    if (tsTypes.some(t => normalizeType(t) === normalizedSource)) {
      if (normalizeType(pgType) === normalizedTarget) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalize type string for comparison
 */
function normalizeType(type: string): string {
  return type
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\d+\)/g, '') // Remove precision like varchar(255)
    .replace(/\[\]/g, '') // Remove array brackets
    .trim();
}

// ============================================================================
// SCHEMA COMPARISON
// ============================================================================

/**
 * Compare two schema definitions and find all mismatches
 */
export function compareSchemas(
  source: SchemaDefinition,
  target: SchemaDefinition,
  config: SchemaAlignmentConfig = DEFAULT_CONFIG
): AlignmentMismatch[] {
  const mismatches: AlignmentMismatch[] = [];

  const sourceFields = new Map(
    source.fields
      .filter(f => !config.ignoredFields.includes(f.name))
      .map(f => [normalizeFieldName(f.name), f])
  );

  const targetFields = new Map(
    target.fields
      .filter(f => !config.ignoredFields.includes(f.name))
      .map(f => [normalizeFieldName(f.name), f])
  );

  // Check for missing fields in target
  for (const [normalizedName, field] of sourceFields) {
    if (!targetFields.has(normalizedName)) {
      const severity = determineMissingSeverity(field, config);
      mismatches.push({
        type: 'missing_field',
        source: source.source,
        target: target.source,
        expected: field,
        actual: null,
        severity,
        suggestion: `Add field '${field.name}' to ${target.source} schema (${target.name})`,
      });
    }
  }

  // Check for extra fields in target (might be intentional)
  for (const [normalizedName, field] of targetFields) {
    if (!sourceFields.has(normalizedName)) {
      mismatches.push({
        type: 'extra_field',
        source: source.source,
        target: target.source,
        expected: null,
        actual: field,
        severity: 'low',
        suggestion: `Field '${field.name}' in ${target.source} (${target.name}) not present in ${source.source} (${source.name})`,
      });
    }
  }

  // Check for type and nullability mismatches
  for (const [normalizedName, sourceField] of sourceFields) {
    const targetField = targetFields.get(normalizedName);
    if (targetField) {
      // Type mismatch
      if (!areTypesCompatible(sourceField.type, targetField.type, config)) {
        mismatches.push({
          type: 'type_mismatch',
          source: source.source,
          target: target.source,
          expected: sourceField.type,
          actual: targetField.type,
          severity: config.severityOverrides[`${normalizedName}.type`] || 'high',
          suggestion: `Change '${sourceField.name}' type in ${target.source} from '${targetField.type}' to compatible type for '${sourceField.type}'`,
        });
      }

      // Nullable mismatch (only flag if source is NOT NULL but target allows null)
      if (!sourceField.nullable && targetField.nullable && config.strictMode) {
        mismatches.push({
          type: 'nullable_mismatch',
          source: source.source,
          target: target.source,
          expected: sourceField.nullable,
          actual: targetField.nullable,
          severity: 'medium',
          suggestion: `Field '${sourceField.name}' is required in ${source.source} but optional in ${target.source}`,
        });
      }

      // Enum mismatch
      if (sourceField.enumValues && targetField.enumValues) {
        const missingEnums = sourceField.enumValues.filter(
          v => !targetField.enumValues?.includes(v)
        );
        if (missingEnums.length > 0) {
          mismatches.push({
            type: 'enum_mismatch',
            source: source.source,
            target: target.source,
            expected: sourceField.enumValues,
            actual: targetField.enumValues,
            severity: 'medium',
            suggestion: `Add enum values [${missingEnums.join(', ')}] to '${sourceField.name}' in ${target.source}`,
          });
        }
      }
    }
  }

  return mismatches;
}

/**
 * Normalize field name for comparison (handle camelCase ↔ snake_case)
 */
function normalizeFieldName(name: string): string {
  // Convert camelCase to snake_case
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/_+/g, '_');
}

/**
 * Determine severity for missing field
 */
function determineMissingSeverity(
  field: SchemaField,
  config: SchemaAlignmentConfig
): DriftSeverity {
  // Check for overrides
  const override = config.severityOverrides[`${field.name}.missing`];
  if (override) return override;

  // Primary keys and foreign keys are critical
  if (field.isPrimaryKey || field.isForeignKey) return 'critical';

  // Non-nullable fields are high severity
  if (!field.nullable) return 'high';

  // Nullable fields are medium
  return 'medium';
}

// ============================================================================
// FULL ALIGNMENT CHECK
// ============================================================================

/**
 * Perform comprehensive UI ↔ API ↔ DB alignment check
 */
export async function checkFullAlignment(
  entityName: string,
  dbTable: string,
  options: {
    tsInterface?: { code: string; name: string };
    apiSpec?: { spec: Record<string, unknown>; path: string; method: string };
    uiComponent?: { code: string; name: string };
    migrationSQL?: string;
    config?: SchemaAlignmentConfig;
  } = {}
): Promise<AlignmentCheckResult> {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const mismatches: AlignmentMismatch[] = [];
  const recommendations: string[] = [];
  const checksPerformed: string[] = [];

  // Extract all schemas
  const schemas: { key: string; schema: SchemaDefinition | null }[] = [];

  // Database schema (source of truth)
  const dbSchema = await extractDatabaseSchema(dbTable);
  schemas.push({ key: 'database', schema: dbSchema });
  checksPerformed.push('database_schema_extraction');

  // TypeScript interface
  if (options.tsInterface) {
    const tsSchema = extractTypeScriptSchema(
      options.tsInterface.code,
      options.tsInterface.name
    );
    schemas.push({ key: 'typescript', schema: tsSchema });
    checksPerformed.push('typescript_interface_extraction');
  }

  // API specification
  if (options.apiSpec) {
    const apiSchema = extractAPISchema(
      options.apiSpec.spec,
      options.apiSpec.path,
      options.apiSpec.method
    );
    schemas.push({ key: 'api', schema: apiSchema });
    checksPerformed.push('api_schema_extraction');
  }

  // UI component
  if (options.uiComponent) {
    const uiSchema = extractUISchema(
      options.uiComponent.code,
      options.uiComponent.name
    );
    schemas.push({ key: 'ui', schema: uiSchema });
    checksPerformed.push('ui_schema_extraction');
  }

  // Migration file
  if (options.migrationSQL) {
    const migrationSchema = extractMigrationSchema(
      options.migrationSQL,
      dbTable
    );
    schemas.push({ key: 'migration', schema: migrationSchema });
    checksPerformed.push('migration_schema_extraction');
  }

  // Compare all schemas against database (source of truth)
  if (!dbSchema) {
    mismatches.push({
      type: 'schema_unavailable',
      source: 'database',
      target: 'check',
      expected: 'schema',
      actual: null,
      severity: 'critical',
      suggestion: `Unable to read schema for table '${dbTable}'. Verify table exists.`,
    });
  } else {
    for (const { key, schema } of schemas) {
      if (schema && key !== 'database') {
        const schemaMismatches = compareSchemas(dbSchema, schema, config);
        mismatches.push(...schemaMismatches);
        checksPerformed.push(`compare_database_vs_${key}`);
      }
    }
  }

  // Generate recommendations
  if (mismatches.length > 0) {
    recommendations.push(`Found ${mismatches.length} alignment issues for ${entityName}`);

    const criticalCount = mismatches.filter(m => m.severity === 'critical').length;
    const highCount = mismatches.filter(m => m.severity === 'high').length;
    const typeIssues = mismatches.filter(m => m.type === 'type_mismatch').length;
    const missingFields = mismatches.filter(m => m.type === 'missing_field').length;

    if (criticalCount > 0) {
      recommendations.push(`CRITICAL: ${criticalCount} critical alignment issues require immediate attention`);
    }
    if (highCount > 0) {
      recommendations.push(`HIGH: ${highCount} high-severity issues should be fixed soon`);
    }
    if (typeIssues > 0) {
      recommendations.push(`Consider regenerating TypeScript types from database schema`);
    }
    if (missingFields > 0) {
      recommendations.push(`${missingFields} missing fields may cause runtime errors`);
    }
  }

  // Calculate overall severity
  let severity: DriftSeverity = 'info';
  if (mismatches.some(m => m.severity === 'critical')) severity = 'critical';
  else if (mismatches.some(m => m.severity === 'high')) severity = 'high';
  else if (mismatches.some(m => m.severity === 'medium')) severity = 'medium';
  else if (mismatches.some(m => m.severity === 'low')) severity = 'low';

  return {
    aligned: mismatches.length === 0,
    severity,
    mismatches,
    recommendations,
    confidence: 0.90, // High confidence for static schema analysis
    timestamp: new Date(),
    checksPerformed,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SchemaAlignmentChecker = {
  extractDatabaseSchema,
  extractTypeScriptSchema,
  extractAPISchema,
  extractUISchema,
  extractMigrationSchema,
  compareSchemas,
  areTypesCompatible,
  checkFullAlignment,
};
