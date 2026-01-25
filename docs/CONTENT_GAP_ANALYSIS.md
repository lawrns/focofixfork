# Cursos Platform - Content Gap Analysis

**Analysis Date:** January 24, 2026
**PRD Reference:** `/docs/PRD_CURSOS.md`
**Analyst:** Content Analysis Specialist
**Scope:** Pure content analysis - excludes animations, deployment, and testing concerns

---

## Executive Summary

The Cursos platform has implemented the foundational infrastructure for course delivery, but the **actual course content is severely incomplete compared to PRD specifications**. The platform has a "skeleton" course with placeholder content that lacks the depth, structure, and completeness required for the flagship "De Developer a Vibe Coder" course.

**Overall Content Completeness: ~15%**

| Category | PRD Requirement | Current Status | Gap |
|----------|----------------|----------------|-----|
| Course Structure | 8 modules + orientation | 9 modules created | Structure exists |
| Content Depth | 4 hours (240 min) | 240 min allocated | Time allocated, content missing |
| Content Quality | Detailed lessons with exercises | 1-2 sentence placeholders per module | 95% gap |
| Checkpoints | 9 interactive checkpoints | 1 placeholder checkpoint | 89% gap |
| Language | Spanish | Spanish | Met |

---

## PRD Requirements Checklist

### FR-007: Flagship Course Content (P0 - MVP)

**Status: STRUCTURE COMPLETE, CONTENT INCOMPLETE**

#### Module 0: Orientacion (10 min) - INCOMPLETE
**PRD Requirements:**
- Que significa "vibe coding" en Fyves (no es lo que crees)
- La regla de oro: IA explora, humanos deciden
- 4 reglas fundamentales de desarrollo Fyves
- Checkpoint: Reconocer las 4 reglas basicas

**Actual Content:**
```markdown
# Modulo 0: Orientacion

## Que es Vibe Coding?
Vibe coding no es lo que crees.

## Las 4 Reglas
1. IA explora, humanos deciden
2. Codigo antes de prompts
3. Compuestos, no monolitos
4. Determinismo > elegancia
```

**Gap Analysis:**
- MISSING: Detailed explanation of what "vibe coding" actually means
- MISSING: Context for why it's "not what you think"
- MISSING: Elaboration on each of the 4 rules with examples
- MISSING: Checkpoint exercise
- **Completeness: 20%** (has outline only)

---

#### Module 1: The Vibe Shift (30 min) - INCOMPLETE
**PRD Requirements:**
- Por que sobre-planear mata velocidad
- El loop de ansiedad y como los agentes lo rompen
- Exploracion paralela vs pensamiento lineal
- "No se todavia" como estado valido
- Exercise: Reescribir un plan tradicional en un brief de agent swarm

**Actual Content:**
```markdown
# Modulo 1: The Vibe Shift

## El problema del control
La mayoria de desarrolladores queremos control total.

## El cambio a orquestacion
Vibe coding cambia la pregunta.
```

**Gap Analysis:**
- MISSING: Content about over-planning killing speed
- MISSING: Anxiety loop explanation
- MISSING: Parallel vs linear thinking comparison
- MISSING: "No se todavia" concept
- MISSING: Agent swarm brief exercise
- **Completeness: 10%** (has headings only)

---

#### Module 2: AI Stack Reality (45 min) - INCOMPLETE
**PRD Requirements:**
- Fortalezas y debilidades de Claude Opus 4.5
- Economia de ejecucion de GLM 4.7
- Costo por hora: planning vs execution
- Latencia vs profundidad de razonamiento
- Estrategias de routing hibrido
- Comparison Lab table (provided in PRD)
- Checkpoint: Elegir el modelo WRONG a proposito y explicar por que falla

**Actual Content:**
```markdown
# Modulo 2: AI Stack Reality

## La realidad de los modelos
No todos los modelos son iguales.
```

**Gap Analysis:**
- MISSING: Claude Opus 4.5 strengths/weaknesses
- MISSING: GLM 4.7 execution economics
- MISSING: Cost per hour analysis
- MISSING: Latency vs reasoning depth tradeoffs
- MISSING: Hybrid routing strategies
- MISSING: Comparison Lab table
- MISSING: Wrong model checkpoint exercise
- **Completeness: 5%** (one sentence)

---

#### Module 3: Prompts as Architecture (40 min) - INCOMPLETE [CRITICAL]
**PRD Requirements:**
- Prompts como intencion ejecutable
- Restricciones estilo Ralph
- Politicas STOP y politicas TRUTH
- Enforcement de evidencia
- Prompts "describe solo realidad"
- Exercise: Convertir un bug report vago en un prompt de auditoria estricto

**Actual Content:**
```markdown
# Modulo 3: Prompts as Architecture

## Los prompts son especificaciones ejecutables
```

**Gap Analysis:**
- MISSING: Prompts as executable intention concept
- MISSING: Ralph-style restrictions
- MISSING: STOP and TRUTH policies
- MISSING: Evidence enforcement
- MISSING: "Reality only" prompt patterns
- MISSING: Bug report conversion exercise
- **Completeness: 5%** (one sentence)

**CRITICAL NOTE:** This module is marked CRITICAL in PRD and is 95% missing.

---

#### Module 4: Multi-Agent Command (45 min) - INCOMPLETE
**PRD Requirements:**
- Cuando dividir agentes
- Cuantos es demasiados
- Patrones de arbitraje en council
- Prevenir camaras de eco de agentes
- Escenario Live: Un sistema, cinco agentes conflictivos
- Resolver sin reescribir codigo

**Actual Content:**
```markdown
# Modulo 4: Multi-Agent Command

## Cuando dividir en agentes?
```

**Gap Analysis:**
- MISSING: When to split agents guidance
- MISSING: "How many is too many" discussion
- MISSING: Council arbitration patterns
- MISSING: Echo chamber prevention
- MISSING: Live scenario with 5 conflicting agents
- MISSING: Code-free resolution strategies
- **Completeness: 5%** (one heading)

---

#### Module 5: Infrastructure Awareness (30 min) - INCOMPLETE
**PRD Requirements:**
- Deploy en Vercel vs Netlify
- Verdad de errores con Sentry
- Bugs de build-time vs runtime
- Cost traps a escala
- Checkpoint: Identificar si un bug pertenece a codigo, infra, o configuracion

**Actual Content:**
```markdown
# Modulo 5: Infrastructure Awareness

## Donde vibe coding encuentra la realidad
```

**Gap Analysis:**
- MISSING: Vercel vs Netlify deployment comparison
- MISSING: Sentry error truth
- MISSING: Build-time vs runtime bugs
- MISSING: Scale-related cost traps
- MISSING: Bug classification checkpoint
- **Completeness: 5%** (one heading)

---

#### Module 6: IDEs & Execution (25 min) - INCOMPLETE
**PRD Requirements:**
- Cursor vs Claude Code vs VS Code puro
- Sesiones SSH y persistencia
- Problemas de ilusion de terminal
- Cuando reiniciar no arregla nada
- Exercise: Diagnosticar un failure de "working locally"

**Actual Content:**
```markdown
# Modulo 6: IDEs & Execution

## Tus herramientas mienten
```

**Gap Analysis:**
- MISSING: IDE comparison (Cursor/Claude Code/VS Code)
- MISSING: SSH session persistence issues
- MISSING: Terminal illusion problems
- MISSING: "When restart doesn't help" scenarios
- MISSING: "Working locally" diagnosis exercise
- **Completeness: 5%** (one heading)

---

#### Module 7: Production Discipline (25 min) - INCOMPLETE
**PRD Requirements:**
- Ley de serializacion
- No `as any` sin confesion
- Disciplina de DTOs
- Paranoia de build-time
- Exercise Final: Auditar un subsistema pequeno y reportar solo hechos

**Actual Content:**
```markdown
# Modulo 7: Production Discipline

## Las reglas invisibles
```

**Gap Analysis:**
- MISSING: Serialization law explanation
- MISSING: "No as any without confession" rule
- MISSING: DTO discipline practices
- MISSING: Build-time paranoia concept
- MISSING: Final subsystem audit exercise
- **Completeness: 5%** (one heading)

---

#### Module 8: Certificacion (10 min) - INCOMPLETE
**PRD Requirements:**
- Badge interno "Fyves Vibe Coder - Nivel 1"
- Requisitos: 100% secciones completadas
- Requisitos: Todos checkpoints superados
- Requerido para acceso a repos sensibles

**Actual Content:**
```markdown
# Modulo 8: Certificacion Final

## Felicidades
Has completado todos los modulos.
```

**Gap Analysis:**
- MISSING: Badge significance explanation
- MISSING: Requirements restatement
- MISSING: Next steps after certification
- MISSING: Access to sensitive repos information
- **Completeness: 30%** (has basic congratulatory text)

**Content Type Marked as:** `checkpoint` (but checkpoint functionality not implemented - see P1 gaps)

---

## Content Structure Analysis

### Current File Locations

| File | Purpose | Status |
|------|---------|--------|
| `/scripts/ralph/vibe-coder-course.json` | Course content source | INCOMPLETE |
| `/scripts/ralph/insert-cursos-course.ts` | Database insertion script | READY |
| `/supabase/migrations/20260124000000_create_cursos_platform.sql` | Database schema | COMPLETE |
| `/src/app/organizations/[id]/cursos/` | Course pages | COMPLETE |
| `/src/app/api/cursos/` | API endpoints | COMPLETE |

### Content Storage

The course content exists in `/scripts/ralph/vibe-coder-course.json` with the following structure:
- 9 sections (modules 0-8)
- Each section has: `title`, `content_type`, `content`, `sort_order`, `duration_minutes`
- All content is `markdown` type (no videos)
- Section 8 is marked as `checkpoint` type

**Critical Finding:** The course content has NEVER been inserted into the database. The insertion script exists but requires:
1. Migration to be applied (schema exists but may not be applied to production)
2. Script to be run with a workspace ID: `bun scripts/ralph/insert-cursos-course.ts <workspace_id>`

---

## Missing Content from PRD Specifications

### 1. Detailed Explanations (100% missing)
Every module requires substantial explanatory content that doesn't exist:
- Concepts need 2-3 paragraph explanations minimum
- Code examples for each principle
- Visual diagrams or comparisons (could be markdown tables)
- Real-world scenarios from Fyves context

### 2. Exercises (100% missing)
PRD specifies 5 exercises that are completely absent:
1. Module 1: Reescribir plan tradicional en brief de agent swarm
2. Module 2: Elegir modelo WRONG y explicar fallo
3. Module 3: Convertir bug report en prompt de auditoria
4. Module 6: Diagnosticar "working locally" failure
5. Module 7: Auditar subsistema y reportar hechos

### 3. Checkpoints (89% missing)
- PRD requires 9 checkpoints (one per module)
- Only Module 8 is marked as `checkpoint` type
- Module 8 has no actual checkpoint questions or validation
- No checkpoint validation logic exists (P1 feature)

### 4. Comparison Tables (100% missing)
PRD Module 2 specifies a detailed comparison table:
```markdown
| Tipo de tarea | Claude Opus | GLM 4.7 | Recomendacion |
|---------------|-------------|---------|---------------|
| PRD profundo | Alto | Medio | Claude |
| Refactors | Medio | Alto | GLM |
| Debug loops | Bajo | Alto | GLM |
| Arquitectura | Alto | Medio | Claude |
```
This table is not present in the content.

### 5. Code Examples (100% missing)
The course should include:
- Example prompts (good vs bad)
- Multi-agent configuration examples
- Infrastructure code snippets
- Anti-patterns to avoid

### 6. Fyves-Specific Context (95% missing)
PRD emphasizes this is "Fyves institutional memory" but:
- No references to actual Fyves projects
- No Fyves-specific patterns mentioned
- No connection to actual Fyves tech stack
- Generic content could apply to any company

---

## Content Quality Assessment

### Depth: FAIL (5/100)
- Current content averages 1-2 sentences per module
- PRD specifies modules should take 10-45 minutes each
- Reading current content would take ~30 seconds total

### Completeness: FAIL (15/100)
- 8/9 modules have only headings
- 0/5 exercises present
- 0/9 checkpoints functional
- 0 comparison tables included

### Formatting: PARTIAL (40/100)
- Markdown format is correct
- Section structure is sound
- Missing: proper heading hierarchy within modules
- Missing: lists, code blocks, tables, callouts
- Missing: visual structure (no bolding, emphasis, etc.)

### Spanish Language: PASS (100/100)
- Content is correctly in Spanish
- Accents are properly used
- Technical terms kept in English (appropriate)

### Pedagogical Structure: FAIL (10/100)
- No learning objectives stated
- No examples provided
- No practice exercises
- No knowledge checks
- No scaffolding (concept -> example -> practice)

---

## Infrastructure vs Content Status

### Infrastructure: 90% COMPLETE
- Database schema: COMPLETE
- API endpoints: COMPLETE
- Course pages: COMPLETE
- Progress tracking: COMPLETE
- Repository layer: COMPLETE
- Access control: COMPLETE

### Content: 15% COMPLETE
- Module structure: COMPLETE (9 sections)
- Module content: INCOMPLETE (95% missing)
- Exercises: INCOMPLETE (100% missing)
- Checkpoints: INCOMPLETE (89% missing, 11% placeholder)
- Language: COMPLETE (Spanish)

---

## Priority Gaps by Impact

### CRITICAL (Blocks MVP Launch)
1. **Module 3 Content** - Marked CRITICAL in PRD, has only 1 sentence
2. **All Module Exercises** - Required for learning, completely absent
3. **Module 2 Comparison Table** - Specified in PRD, missing

### HIGH (Severely Limits Value)
4. **Detailed Explanations** - All modules need 10-20x more content
5. **Code Examples** - Essential for technical concepts
6. **Module 0-7 Content Body** - Only headings exist

### MEDIUM (Reduces Quality)
7. **Checkpoint Validation** - P1 feature, but checkpoints have no questions
8. **Fyves Context** - Generic content lacks institutional memory
9. **Visual Structure** - Content needs better markdown formatting

### LOW (Nice to Have)
10. **Video Content** - PRD lists as optional v1
11. **Module 8 Expansion** - Has basic content, could be more detailed

---

## Recommended Content Creation Process

### Phase 1: Skeleton Expansion (Priority: CRITICAL)
For each module (0-8):
1. Expand 1-2 sentences to 3-5 paragraphs (~500 words)
2. Add 2-3 examples per concept
3. Include 1 code example per technical module
4. Create markdown tables for comparisons

Estimated effort: 8-12 hours for all modules

### Phase 2: Exercise Creation (Priority: HIGH)
Create 5 exercises as specified in PRD:
1. Module 1: Agent swarm brief conversion
2. Module 2: Wrong model selection
3. Module 3: Bug report to audit prompt
4. Module 6: Local failure diagnosis
5. Module 7: Subsystem audit

Estimated effort: 4-6 hours

### Phase 3: Checkpoint Development (Priority: MEDIUM)
For each module checkpoint:
1. Write 3-5 questions
2. Provide correct answers
3. Add "Review section X" hints for wrong answers
4. Link to relevant module sections

Estimated effort: 6-8 hours (includes implementing P1 checkpoint validation)

### Phase 4: Enhancement (Priority: LOW)
1. Add Fyves-specific context and examples
2. Include real Fyves project references
3. Create comparison tables
4. Add visual callouts and emphasis
5. Consider video scripts for v2

Estimated effort: 4-6 hours

**Total Estimated Effort: 22-32 hours of content creation**

---

## Database Insertion Status

### Current State
- Schema migration file exists: `/supabase/migrations/20260124000000_create_cursos_platform.sql`
- Insertion script exists: `/scripts/ralph/insert-cursos-course.ts`
- Course content JSON exists: `/scripts/ralph/vibe-coder-course.json`

### Required Actions
1. **Apply migration** (if not already done to production)
   - File is complete and ready
   - Creates 5 tables: cursos_courses, cursos_sections, cursos_progress, cursos_checkpoint_attempts, cursos_certifications
   - Includes RLS policies and indexes

2. **Insert course content** (after content is completed)
   ```bash
   bun scripts/ralph/insert-cursos-course.ts <workspace_id>
   ```
   - Checks for existing course before inserting
   - Inserts course + 9 sections
   - Provides output confirmation

3. **Update vibe-coder-course.json** (with completed content)
   - Current file has placeholder content
   - Must be updated before insertion
   - Format is correct, just needs content expansion

---

## P1 Feature Content Implications

The PRD marks several features as P1 (post-MVP), but these have content implications:

### Checkpoints (P1)
- PRD: "No se puede avanzar sin superar checkpoint"
- Current: Section 8 marked as checkpoint but has no questions
- Gap: Need 9 checkpoints with validation logic
- Content dependency: All checkpoint questions and answers

### Certification System (P1)
- PRD: Badge "Fyves Vibe Coder - Nivel 1"
- Current: Table exists, no badge logic
- Gap: Need certification awarding logic
- Content dependency: 100% completion + all checkpoints passed

### Analytics Dashboard (P1)
- PRD: "checkpoints con mayor tasa de fallo"
- Current: Repository has `getCertifiedMembers()` method
- Gap: Need checkpoint attempt tracking and analysis
- Content dependency: Functional checkpoints required first

---

## Next Steps Recommendation

### Immediate (Before Launch)
1. **DO NOT LAUNCH** with current content - severely incomplete
2. Complete Phase 1 content expansion (skeleton expansion)
3. Complete Phase 2 exercise creation
4. Update `vibe-coder-course.json` with expanded content
5. Insert course into database
6. Test course playback end-to-end

### Post-MVP (P1 Features)
1. Implement checkpoint validation system
2. Create all 9 checkpoint questions
3. Implement certification badge logic
4. Add analytics for checkpoint failure rates

### Future Enhancements (P2)
1. Create video scripts based on markdown content
2. Build CMS for course content updates
3. Add second advanced course
4. Create hands-on exercises with real repos

---

## Conclusion

The Cursos platform has solid technical infrastructure but **critically incomplete course content**. The current content is a mere outline with placeholders that would provide ~2 minutes of learning instead of the specified 4 hours.

**Key Finding:** This is not a content refinement task - this is a content creation task. 95% of the actual educational content (explanations, examples, exercises) is missing from the JSON file.

**Recommendation:** Complete content creation (Phases 1-2, ~12-18 hours) before any launch consideration. The infrastructure is ready and will support the content once created.

**Risk Assessment:**
- Launching with current content: HIGH - would damage platform credibility
- Content creation effort: MEDIUM - well-defined scope, clear PRD specs
- Timeline to MVP-ready content: 1-2 weeks with dedicated content creator

---

**Analysis Complete**
Generated by Content Analysis Specialist
Pure content analysis - infrastructure, animations, deployment, and testing intentionally excluded from this report.
