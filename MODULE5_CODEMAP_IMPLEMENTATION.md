# Module 5: Codemap Integration - Implementation Summary

## Overview
This module implements automatic code structure parsing, entry point detection, and Mermaid dependency graph generation for Foco projects. It integrates with Module 6 (Memory) to store codemap insights as searchable memory segments.

## Files Created

### Database Migration
- **Path:** `supabase/migrations/20260304_project_codemaps.sql`
- Creates `project_codemaps` table with RLS policies
- Indexes on `project_id` for efficient lookups
- Triggers for automatic `updated_at` updates

### Type Definitions
- **Path:** `src/features/codemap/types/index.ts`
- Defines: `CodemapNode`, `CodemapEntryPoint`, `ProjectCodemap`, `DependencyEdge`, `CodemapStats`, `ParseOptions`, `CodemapGenerationResult`

### Services

#### 1. Codemap Parser Service
- **Path:** `src/features/codemap/services/codemap-parser.ts`
- **Functions:**
  - `parseProjectStructure(projectPath, options)` - Walks directory tree, parses files
  - `detectEntryPoints(structure)` - Identifies API routes, pages, components, lib files, configs
  - `generateDependencyGraph(nodes)` - Creates Mermaid graph TD format
  - `detectImports(fileContent)` - Parses ES6 imports, dynamic imports, CommonJS requires
  - `calculateStats(nodes)` - Counts files, directories, lines by language

**Entry Point Detection Patterns:**
- API routes: `/api/*`
- Pages: `/app/**/page.tsx`, `/pages/**/*.tsx`
- Components: `/components/**/*.tsx`
- Lib: `/lib/**/*.ts`, `/utils/**/*.ts`, `/hooks/**/*.ts`
- Config: `*.config.{ts,js}`, `package.json`, `tsconfig.json`
- Scripts: `/scripts/*`, `/scripts/**/*`

#### 2. Codemap Sync Service
- **Path:** `src/features/codemap/services/codemap-sync.ts`
- **Functions:**
  - `generateAndStore(projectId, projectPath)` - Main function to parse and store
  - `syncToMemory(codemap)` - Creates memory segments (architecture, api_contracts, patterns)
  - `syncToMermaid(codemap)` - Prepares diagram for mermaid service
  - `getCodemap(projectId)` - Retrieves stored codemap
  - `deleteCodemap(projectId)` - Removes codemap data
  - `getMermaidDiagram(projectId)` - Returns just the diagram text

### React Components

#### 1. CodemapPanel
- **Path:** `src/features/codemap/components/codemap-panel.tsx`
- Collapsible tree view of file structure
- Expand/collapse directories
- Entry point badges (color-coded by type)
- File type icons (TypeScript, JavaScript, CSS, etc.)
- File size display

#### 2. CodemapGraph
- **Path:** `src/features/codemap/components/codemap-graph.tsx`
- Uses `MermaidPreview` from Module Mermaid
- Renders dependency diagram
- Error handling for invalid diagrams

#### 3. CodemapStats
- **Path:** `src/features/codemap/components/codemap-stats.tsx`
- Language breakdown bar charts
- Total files, directories, estimated LOC
- Entry points summary by type
- Generated timestamp

### API Routes

#### 1. Main Codemap Route
- **Path:** `src/app/api/codemap/[projectId]/route.ts`
- **Methods:**
  - `GET` - Returns codemap for project
  - `POST` - Triggers regeneration (requires write access)
  - `DELETE` - Removes codemap (requires owner)

#### 2. Mermaid Diagram Route
- **Path:** `src/app/api/codemap/[projectId]/mermaid/route.ts`
- **Methods:**
  - `GET` - Returns Mermaid diagram text
  - Query params: `format=text|download` for different outputs

### Integration with Module 6 (Memory)

#### Memory Indexer Update
- **Path:** `src/features/memory/services/memory-indexer.ts`
- Added `indexFromCodemap(codemap)` function
- Creates memory segments:
  - **architecture** topic: Entry points organized by type
  - **api_contracts** topic: API routes list
  - **patterns** topic: Language statistics and file counts

## Usage Examples

### Generate Codemap
```typescript
import { generateAndStore } from '@/features/codemap';

const result = await generateAndStore(projectId, '/path/to/project');
if (result.success) {
  console.log('Codemap generated:', result.codemap);
}
```

### Get Codemap via API
```bash
# Get codemap data
GET /api/codemap/{projectId}

# Trigger regeneration
POST /api/codemap/{projectId}
{
  "projectPath": "/path/to/project"  // optional
}

# Get Mermaid diagram
GET /api/codemap/{projectId}/mermaid
GET /api/codemap/{projectId}/mermaid?format=text
GET /api/codemap/{projectId}/mermaid?format=download
```

### Use Components
```tsx
import { CodemapPanel, CodemapGraph, CodemapStats } from '@/features/codemap';

// In your component:
<CodemapPanel structure={codemap.structure} entryPoints={codemap.entry_points} />
<CodemapGraph mermaidCode={codemap.dependency_graph_mermaid} />
<CodemapStats stats={codemap.stats} entryPoints={codemap.entry_points} generatedAt={codemap.generated_at} />
```

## Security Considerations

1. **RLS Policies:** Codemap data accessible only to project owners and team members
2. **API Authorization:** All routes check user authentication and project access
3. **Path Validation:** Project paths should be validated before file system access
4. **Depth Limits:** Maximum depth of 20 to prevent massive trees
5. **Exclusions:** Respects `.gitignore` and excludes sensitive directories

## Performance Considerations

1. **Async File Operations:** Uses `fs/promises` for non-blocking I/O
2. **Depth Limiting:** Prevents runaway directory traversal
3. **Import Caching:** Node map built once for efficient lookup
4. **Token Estimation:** Simple character/4 estimation for memory budget
5. **Database Upserts:** Uses `onConflict` for efficient updates

## Migration Steps

1. Run the database migration:
   ```bash
   supabase db push
   # or
   psql -f supabase/migrations/20260304_project_codemaps.sql
   ```

2. Generate codemap for existing projects (optional):
   ```bash
   curl -X POST /api/codemap/{projectId} \
     -H "Authorization: Bearer {token}" \
     -d '{"projectPath": "/path/to/project"}'
   ```

## Future Enhancements

- Support for additional language import patterns
- Graph depth limiting for very large projects
- Incremental updates (only changed files)
- Git integration for version-aware codemaps
- Export to additional formats (Graphviz, D2)
- Visual highlighting of circular dependencies
