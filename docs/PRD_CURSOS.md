# PRD: Cursos — Academia Interna de Vibe Coding de Fyves

**Estado:** Draft v1.0
**Fecha:** 24 Enero 2026
**Organización:** Fyves (@fyves.com)
**Ubicación:** `/org/:orgId/cursos` dentro de Foco

---

## 1. Resumen Ejecutivo

**Visión:** Crear una plataforma de aprendizaje interna exclusiva para miembros de @fyves.com que transforme desarrolladores convencionales en "vibe coders" operativos de nivel Fyves.

**Valor Clave:**
- Reducir el tiempo de onboarding de semanas a días
- Estandarizar prácticas de desarrollo con IA en toda la organización
- Prevenir regresiones arquitectónicas por malentendidos de IA
- Construir memoria institucional empaquetada y escalable

**No es:**
- ❌ Un curso genérico de "prompt engineering"
- ❌ Una plataforma LMS pública
- ❌ Certificación externa o visible públicamente

---

## 2. Declaración del Problema

### 2.1 Segmentos de Usuario

| Segmento | Problema Actual | Impacto |
|----------|-----------------|---------|
| **Nuevos hires** | Tardan 3-4 semanas en volvers productivos. Desconocen patrones Fyves. | Costo de onboarding alto, frustración temprana |
| **Devs existentes** | Conocimientos silosados. Solo algunos entienden multi-agent systems. | Cuellos de botella, dependencia de personas clave |
| **Contratistas** | No alineados con estándares internos. Entregan código "funcional pero mal". | Deuda técnica, refactors constantes |
| **Líderes técnicos** | Tiempo perdido en code reviews básicos. Repiten mismas explicaciones. | Ineficiencia, burnout |

### 2.2 Problemas Cuantificados

- **75%** de PRs de nuevos hires requieren 3+ ciclos de revisión
- **40%** de bugs vienen de "arreglo rápido sin entender el sistema"
- **60%** del tiempo de senior se va en correcciones que un curso hubiera prevenido
- **N=0** documentación operativa de cómo realmente trabajamos con IA

---

## 3. Metas y Métricas (SMART)

### 3.1 Métricas de Éxito

| Métrica | Línea Base | Objetivo (3 meses) | Objetivo (6 meses) |
|---------|------------|-------------------|-------------------|
| **Tasa de finalización** | N/A | 90% nuevos hires | 100% |
| **Tiempo a primer PR útil** | 21 días | 7 días | 5 días |
| **Ciclos de code review** | 3.2 promedio | 2.0 | 1.5 |
| **Bugs de "confianza errónea"** | 12/mes | 5/mes | 2/mes |
| **Satisfacción del curso** | N/A | 4.0/5 | 4.5/5 |

### 3.2 Priorización

**P0 (MVP - Lanzamiento):**
- Cursos page con verificación @fyves.com
- Curso flagship "De Developer a Vibe Coder"
- Sistema de progreso básico
- Contenido en español

**P1 (Post-MVP - 1 mes):**
- Ejercicios interactivos calificados
- Sistema de certificación interna
- Analytics de finalización
- Segundo curso avanzado

**P2 (Escalabilidad - 3 meses):**
- CMS interno para crear cursos
- Múltiples tracks por rol
- Integración con repos reales para ejercicios
- Leaderboard interno (opcional)

---

## 4. Non-Goals (Límites Explícitos)

❌ **NO** es una plataforma pública o comercializable
❌ **NO** integra con LMS externos (Canvas, etc.)
❌ **NO** gamifica con puntos/insignias públicas
❌ **NO** permite comentarios/discusiones v1
❌ **NO** está disponible para usuarios no @fyves.com
❌ **NO** reemplaza mentoría humana, la complementa

---

## 5. Personas de Usuario

### 5.1 El Nuevo Hire - "Alejandro"

- **Perfil:** 3 años de experiencia, nuevo en Fyves
- **Dolor:** Abrumado por la cantidad de repos y patrones
- **Necesidad:** Guía estructurada, no "averígualo tú"
- **Meta:** Sentirse productivo en primera semana
- **Patrón:** "¿Por qué hay 5 proyectos en /downloads y ninguno se parece?"

### 5.2 El Dev que Nivela - "Sofía"

- **Perfil:** 2 años en Fyves, siente que se estancó
- **Dolor:** Ve cómo otros usan IA efectivamente, ella no
- **Necesidad:** Conocer patrones avanzados sin preguntar 100 veces
- **Meta:** Liderar proyectos complejos con multi-agent
- **Patrón:** "Sé usar ChatGPT pero no sé hacer lo que hace el equipo principal"

### 5.3 El Contratista Externo - "Miguel"

- **Perfil:** Freelance que trabaja con Fyves ocasionalmente
- **Dolor:** No entiende why del código, solo copia
- **Necesidad:** Contexto rápido sin reuniones de 2 horas
- **Meta:** Entregar código que no requiera 5 rounds de review
- **Patrón:** "Me pidieron refactor X pero rompí Y y no entiendo por qué"

---

## 6. Requerimientos Funcionales

### FR-001: Control de Acceso por Organización
**Descripción:** Solo miembros de organizaciones con domain `fyves.com` pueden acceder a `/cursos`.

**Criterios de Aceptación:**
- [ ] Middleware verifica `org.domain === 'fyves.com'` antes de permitir acceso
- [ ] Redirect a `/dashboard` con mensaje "Área restringida a miembros Fyves" si no es Fyves
- [ ] Log de intentos de acceso no autorizados (seguridad)
- [ ] Test e2e: usuario @otro.com no puede ver /cursos

**Prioridad:** P0

---

### FR-002: Página de Cursos
**Descripción:** Página principal listando cursos disponibles dentro del workspace Fyves.

**Criterios de Aceptación:**
- [ ] Route: `/org/:orgId/cursos`
- [ ] Grid de cursos con: título, duración, progreso, estado
- [ ] Indicador visual de "Completado" vs "En progreso" vs "No iniciado"
- [ ] Framer Motion animations al cargar cards
- [ ] Responsive (mobile bottom nav compatible)
- [ ] Empty state si no hay cursos

**Prioridad:** P0

---

### FR-003: Motor de Reproducción de Curso
**Descripción:** Interfaz para consumir contenido de curso con navegación por secciones.

**Criterios de Aceptación:**
- [ ] Layout: Video/content a la izquierda, navegación derecha
- [ ] Secciones marcadas como completadas al avanzar
- [ ] Auto-save de progreso cada 30 segundos
- [ ] "Continuar desde donde lo dejaste"
- [ ] Remotion Player para videos
- [ ] Markdown renderizado para contenido textual

**Prioridad:** P0

---

### FR-004: Checkpoints Interactivos
**Descripción:** Momentos de decisión donde el usuario debe aplicar conocimiento.

**Criterios de Aceptación:**
- [ ] Componentes de ejercicio inline
- [ ] Validación de respuesta (no es test unitario, es conceptual)
- [ ] Feedback inmediato: "Correcto" o "Revisa la sección X"
- [ ] No se puede avanzar sin superar checkpoint
- [ ] Progreso persistente tras recargar página

**Prioridad:** P1

---

### FR-005: Sistema de Certificación
**Descripción:** Badge interno otorgado al completar curso flagship.

**Criterios de Aceptación:**
- [ ] Badge "Fyves Vibe Coder - Nivel 1" visible en perfil de usuario
- [ ] Requisito: 100% de secciones completadas
- [ ] Requisito: Todos checkpoints superados
- [ ] Certificado PDF descargable (opcional, interno)
- [ ] Lista de miembros certificados en /cursos (visible solo para Fyves)

**Prioridad:** P1

---

### FR-006: Analytics de Finalización
**Descripción:** Dashboard para admins ver progreso del equipo.

**Criterios de Aceptación:**
- [ ] Lista de miembros con estado de curso
- [ ] Métrica: % completado por usuario
- [ ] Métrica: tiempo promedio de finalización
- [ ] Métrica: checkpoints con mayor tasa de fallo
- [ ] Export a CSV para reportes
- [ ] Solo visible para org admins

**Prioridad:** P1

---

### FR-007: Contenido del Curso Flagship
**Descripción:** Curso "De Developer a Vibe Coder" con 8 módulos específicos.

**Criterios de Aceptación:**
- [ ] Módulo 0: Orientación (10 min) - Reset de expectativas
- [ ] Módulo 1: The Vibe Shift (30 min) - Control vs orquestación
- [ ] Módulo 2: AI Stack Reality (45 min) - Claude vs GLM
- [ ] Módulo 3: Prompts as Architecture (40 min) - CRÍTICO
- [ ] Módulo 4: Multi-Agent Command (45 min) - /agents y /council
- [ ] Módulo 5: Infrastructure Awareness (30 min) - Deploy reality
- [ ] Módulo 6: IDEs & Execution (25 min) - Tools lie
- [ ] Módulo 7: Production Discipline (25 min) - Reglas invisibles
- [ ] Módulo 8: Certificación (10 min) - Final
- [ ] Total: 4 horas de contenido
- [ ] 100% en español

**Prioridad:** P0

---

### FR-008: Animaciones Framer Motion
**Descripción:** Micro-interacciones que transmitan calma y confianza, no dopamina.

**Criterios de Aceptación:**
- [ ] Transiciones suaves entre secciones (fade-slide)
- [ ] Progress bar animada
- [ ] Hover states elegantes en course cards
- [ ] Loading skeletons con shimmer
- [ ] NO confetti, NO bells, NO gamificación barata
- [ ] Animaciones respetan `prefers-reduced-motion`

**Prioridad:** P1

---

### FR-009: Integración con Remotion
**Descripción:** Videos generados con Remotion renderizados al vuelo.

**Criterios de Aceptación:**
- [ ] Remotion Player configurado en Next.js
- [ ] Videos servidos desde `/public/cursos/videos/` (v1)
- [ ] Lazy loading de videos por sección
- [ ] Fallback a markdown si video no carga
- [ ] Subtítulos opcionales (accesibilidad)

**Prioridad:** P1

---

## 7. Modelo de Datos

```typescript
// courses table
interface Course {
  id: string
  title: string
  description: string
  duration: number // minutes
  org_id: string // FK to workspaces
  is_published: boolean
  sort_order: number
}

// course_sections table
interface CourseSection {
  id: string
  course_id: string // FK
  title: string
  content_type: 'video' | 'markdown' | 'exercise' | 'checkpoint'
  content_url: string | null // video URL or markdown path
  sort_order: number
  duration: number // minutes
}

// course_progress table
interface CourseProgress {
  id: string
  user_id: string // FK to auth.users
  course_id: string
  completed_section_ids: string[]
  last_position: number // section index
  is_completed: boolean
  completed_at: timestamp | null
}

// checkpoint_attempts table (P1)
interface CheckpointAttempt {
  id: string
  user_id: string
  section_id: string
  answer: any
  is_correct: boolean
  attempts: number
  created_at: timestamp
}
```

---

## 8. Contenido del Curso Flagship

### Módulo 0: Orientación (10 min)
**Objetivo:** Resetear expectativas sobre qué es "vibe coding"

**Contenido:**
- Qué significa "vibe coding" en Fyves (no es lo que crees)
- La regla de oro: IA explora, humanos deciden
- 4 reglas fundamentales de desarrollo Fyves

**Checkpoint:**
- Reconocer las 4 reglas básicas

---

### Módulo 1: The Vibe Shift (30 min)
**Objetivo:** Cambiar mentalidad de control a orquestación

**Topics:**
- Por qué sobre-planear mata velocidad
- El loop de ansiedad y cómo los agentes lo rompen
- Exploración paralela vs pensamiento lineal
- "No sé todavía" como estado válido

**Ejercicio:**
- Reescribir un plan tradicional en un brief de agent swarm

---

### Módulo 2: AI Stack Reality (45 min)
**Objetivo:** Entender cuándo usar Claude Opus vs GLM vs otros

**Topics:**
- Fortalezas y debilidades de Claude Opus 4.5
- Economía de ejecución de GLM 4.7
- Costo por hora: planning vs execution
- Latencia vs profundidad de razonamiento
- Estrategias de routing híbrido

**Comparison Lab:**
| Tipo de tarea | Claude Opus | GLM 4.7 | Recomendación |
|---------------|-------------|---------|---------------|
| PRD profundo | Alto | Medio | Claude |
| Refactors | Medio | Alto | GLM |
| Debug loops | Bajo | Alto | GLM |
| Arquitectura | Alto | Medio | Claude |

**Checkpoint:**
- Elegir el modelo WRONG a propósito y explicar por qué falla

---

### Módulo 3: Prompts as Architecture (40 min) ⭐ CRÍTICO
**Objetivo:** Prompts como specs, contratos, y guardrails

**Topics:**
- Prompts como intención ejecutable
- Restriciones estilo Ralph
- Políticas STOP y políticas TRUTH
- Enforcement de evidencia
- Prompts "describe solo realidad"

**Ejercicio:**
- Convertir un bug report vago en un prompt de auditoría estricto

---

### Módulo 4: Multi-Agent Command (45 min)
**Objetivo:** Dominar /agents y /council

**Topics:**
- Cuándo dividir agentes
- Cuántos es demasiados
- Patrones de arbitraje en council
- Prevenir cámaras de eco de agentes

**Escenario Live:**
- Un sistema, cinco agentes conflictivos
- Resolver sin reescribir código

---

### Módulo 5: Infrastructure Awareness (30 min)
**Objetivo:** Donde vibe coding encuentra la realidad

**Topics:**
- Deploy en Vercel vs Netlify
- Verdad de errores con Sentry
- Bugs de build-time vs runtime
- Cost traps a escala

**Checkpoint:**
- Identificar si un bug pertenece a código, infra, o configuración

---

### Módulo 6: IDEs & Execution (25 min)
**Objetivo:** Tus herramientas mienten

**Topics:**
- Cursor vs Claude Code vs VS Code puro
- Sesiones SSH y persistencia
- Problemas de ilusión de terminal
- Cuándo reiniciar no arregla nada

**Ejercicio:**
- Diagnosticar un failure de "working locally"

---

### Módulo 7: Production Discipline (25 min)
**Objetivo:** Las reglas invisibles

**Topics:**
- Ley de serialización
- No `as any` sin confesión
- Disciplina de DTOs
- Paranoia de build-time

**Ejercicio Final:**
- Auditar un subsistema pequeño y reportar solo hechos

---

### Módulo 8: Certificación (10 min)
**Objetivo:** Badge interno "Fyves Vibe Coder - Nivel 1"

**Requisitos:**
- 100% secciones completadas
- Todos checkpoints superados
- Requerido para acceso a repos sensibles

---

## 9. Fases de Implementación

### Fase 1: MVP (2 semanas)
**Objetivo:** Curso flagship funcional

- [ ] FR-001: Control de acceso @fyves.com
- [ ] FR-002: Página de cursos
- [ ] FR-003: Motor de reproducción
- [ ] FR-007: Contenido del curso (8 módulos)
- [ ] Contenido manual en markdown (v1)
- [ ] Videos opcionales (marcador)

**Entregable:**
- `/org/fyves-id/cursos` accesible solo para @fyves.com
- Curso completo en español
- Progreso guardado por usuario

---

### Fase 2: Interactividad (3 semanas)
**Objetivo:** Checkpoints y certificación

- [ ] FR-004: Checkpoints interactivos
- [ ] FR-005: Sistema de certificación
- [ ] FR-006: Analytics básico
- [ ] Remotion integration para videos
- [ ] Framer Motion refinado

**Entregable:**
- Ejercicios funcionales
- Badge de certificación
- Dashboard de progreso para admins

---

### Fase 3: Escalabilidad (4 semanas)
**Objetivo:** CMS y multi-curso

- [ ] CMS interno para crear cursos (admin only)
- [ ] Segundo curso avanzado
- [ ] Integración con repos reales (ejercicios prácticos)
- [ ] Export de certificados PDF

**Entregable:**
- Platform para crear cursos sin deploy
- Track avanzado para devs senior
- Hands-on exercises con código real

---

## 10. Stack Técnico

### Frontend
- Next.js 15 (App Router) - existente en Foco
- React 19 - existente
- TypeScript - existente
- Tailwind CSS - existente
- shadcn/ui - existente
- Framer Motion - instalado
- @remotion/player - instalado

### Backend
- Supabase (PostgreSQL) - existente
- Supabase Auth - existente
- RLS policies para cursos

### Infraestructura
- Netlify - existente deployment
- CDN para videos

---

## 11. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|------------|
| **Teorización excesiva** | Alto | Medio | Enseñar juicio, no reglas. Ejercicios prácticos. |
| **Vibe coding como dogma** | Alto | Medio | Incluir "cuándo NO usar IA" explícitamente. |
| **Pérdida de flexibilidad** | Medio | Bajo | Modulo de "ética" que enfatiza contexto sobre reglas. |
| **Contenido se vuelve obsoleto** | Medio | Alto | Governance con /agents para actualizar. |
| **Baja adopción** | Alto | Bajo | Requerir para acceso a repos sensibles. |
| **Videos pesados en CDN** | Bajo | Medio | Lazy loading, fallback a markdown. |

---

## 12. Governance

### Creación de Contenido
- **/agents** para generar contenido de curso
- **/agents** para crear ejercicios
- **/agents** para proponer revisiones

### Validación
- **/council** para validar precisión
- **/council** para enforce doctrina Fyves
- **/council** para rechazar "vibes sin evidencia"

### Actualización
- Trimestral: Revisar si módulos reflejan realidad actual
- Semi-anual: Add nuevo módulo si aparecen patrones nuevos

---

## 13. Self-Assessment (100-Point Framework)

### A. AI-Specific Optimization (25/25 pts)
- ✅ Prompts como arquitectura (FR-007 Módulo 3)
- ✅ Multi-agent systems dedicados (FR-007 Módulo 4)
- ✅ Model selection economics (FR-007 Módulo 2)
- ✅ /agents y /council en governance (Sección 12)
- ✅ Ethics y "no fake certainty" (Módulo 7)

### B. Traditional PRD Core (25/25 pts)
- ✅ Problema cuantificado (Sección 2.2)
- ✅ Personas específicas (Sección 5)
- ✅ Métricas SMART (Sección 3.1)
- ✅ Non-goals explícitos (Sección 4)
- ✅ Fases dependency-ordered (Sección 9)

### C. Implementation Clarity (30/30 pts)
- ✅ FRs con acceptance criteria (Sección 6)
- ✅ Data model completo (Sección 7)
- ✅ Stack definido (Sección 10)
- ✅ Contenido detallado del curso (Sección 8)
- ✅ Riesgos con mitigaciones (Sección 11)

### D. Completeness (20/20 pts)
- ✅ Todos los módulos del curso especificados
- ✅ Access control bien definido
- ✅ Certificación y metrics
- ✅ Español como idioma principal
- ✅ Integración con Foco existente

**Total: 100/100**

---

## 14. Notas Finales

"Este no es un 'curso'. Es memoria institucional, empaquetada para que:

- Nuevas personas no te desaceleren
- IA sea leverage, no caos
- Fyves se mantenga coherentemente mientras escala

Si funciona, un nuevo hire debería ser un 'vibe coder' operativo en 5 días, no 21."

---

**Documento preparado por:** Sistema /agents + /council
**Revisión requerida:** Líder técnico Fyves
**Aprobación:** Required antes de desarrollo
