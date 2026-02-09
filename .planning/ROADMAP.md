# Project Roadmap: NeuronLink DB Config & Semantic Context

**Current focus:** Phase 08 - Integration & Polish

---

## Current Status

| Metric | Value |
|--------|-------|
| **Current Phase** | 8 of 8 (Integration & Polish) |
| **Overall Progress** | 87.5% |
| **Requirements Complete** | 42/44 |
| **Phases Complete** | 7/8 |

**Last activity:** 2026-02-11 - Planned Phase 08 (Integration & Polish)

---

## Phase Overview

| # | Phase | Goal | Requirements | Est. Complexity |
|---|-------|------|--------------|-----------------|
| 1 | SQL Editor Fix | Query results display correctly | SQL-01 to SQL-05 | Low |
| 2 | Preview Tab - Field Configuration | Users can organize, rename, and manage field visibility | PREV-01 to PREV-07 | Medium |       
| 3 | Extended Configuration Schema | Configuration type supports semantic metadata | CONF-01 to CONF-08 | Medium |
| 4 | Schema Registry | Auto-extract and store database schema with PK-FK | SCHM-01 to SCHM-06 | Medium |
| 5 | Metrics System | Global and custom metrics with time intelligence | GMET-01 to GMET-07, CMET-01 to CMET-03 | High |
| 6 | Metric Validation | Validate metrics against model and suggest additions | MVAL-01 to MVAL-04 | Medium |
| 7 | AI Context Enhancement | AI has full semantic context access with tiering | AI-01 to AI-06 | Medium |
| 8 | Integration & Polish | End-to-end flow testing, edge cases, UX polish | Cross-cutting | Low |

---

## Phase 1: SQL Editor Fix ✓ Complete

**Goal:** SQL query results display as a proper tabular output below the editor

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Add results display functionality (state + table + errors)
- [x] 01-03-PLAN.md — UI enhancements (resizable sections, collapsible results, row viewer search, SELECT * optimization)
- [x] 01-02-PLAN.md — Human verification of results display       

---

## Phase 2: Preview Tab - Field Configuration ✓ Complete

**Goal:** Users can organize fields into groups, rename them, reorder, and manage visibility

**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md — Preview tab integration with FieldGroupingPanel
- [x] 02-02-PLAN.md — Inline renaming, soft-hide, and reordering  
- [x] 02-03-PLAN.md — Pre-built group templates (Dimensions, Measures, Dates, Identifiers)
- [x] 02-04-PLAN.md — Human verification of field management features

---

## Phase 3: Extended Configuration Schema ✓ Complete

**Goal:** Configuration type includes all semantic metadata fields  

**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — [TDD] State foundation for semantic metadata (types, actions, reducer)
- [x] 03-02-PLAN.md — Persistence layer & schema extension (Supabase migration, configService)
- [x] 03-03-PLAN.md — Semantic metadata UI (Description editor, DataType dropdown)
- [x] 03-04-PLAN.md — On-demand sample scanning (Service implementation & UI integration)

---

## Phase 4: Schema Registry ✓ Complete

**Goal:** Auto-extract database schema including PK-FK relationships from Supabase

**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Foundations & Core Extraction (Registry table, OpenAPI parser, AI descriptions)
- [x] 04-02-PLAN.md — Integration & Persistence (Sync lifecycle, drift detection, connection flow)
- [x] 04-03-PLAN.md — UI & User Management (StructurePanel metadata display, description editing, drift badge)

---

## Phase 5: Metrics System ✓ Complete

**Goal:** Define global and custom metrics with formula builder and time intelligence

**Plans:** 4 plans

Plans:
- [x] 05-01-PLAN.md — Types & Formula Parser (Metric interface, formula parsing, field extraction)
- [x] 05-02-PLAN.md — MetricBuilderModal (Modal UI with real-time validation)
- [x] 05-03-PLAN.md — State Management (Metric actions & reducer) 
- [x] 05-04-PLAN.md — Database & MetricsPanel (Migrations, service, enhanced UI, verification)

---

## Phase 6: Metric Validation ✓ Complete

**Goal:** Validate metric availability and suggest required additions

**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Metric Validation Engine (TDD)
- [x] 06-02-PLAN.md — MetricsPanel UI Integration (Visual feedback)
- [x] 06-03-PLAN.md — MetricSuggestionModal (Resolution flow)     

---

## Phase 7: AI Context Enhancement ✓ Complete

**Goal:** AI Assistant has full semantic context with intelligent tiering

**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md — [TDD] Core Context Builder (tiering logic & trimming)
- [x] 07-02-PLAN.md — AI Service Integration (Gemini upgrade & Expansion protocol)
- [x] 07-03-PLAN.md — Interactive Suggestions UI (Suggestion buttons & Thought rendering)

---

## Phase 8: Integration & Polish

**Goal:** End-to-end flow testing, edge cases, UX polish

**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Setup Playwright & E2E Smoke Test
- [ ] 08-02-PLAN.md — UX Polish: Error Boundaries, Skeletons, & Shortcuts
- [ ] 08-03-PLAN.md — Performance & Mobile: Context Toggle & Responsive Layout

**Requirements:** Cross-cutting polish

**Success Criteria:**
1. Full flow works: Connect → Select tables → Configure fields → Define metrics → Query with AI
2. Edge cases handled: empty tables, null values, disconnection     
3. Loading states for all async operations
4. Error boundaries prevent crashes
5. Keyboard navigation for accessibility
6. Mobile-responsive adjustments (if applicable)

**Key Files:** All components

**Dependencies:** Phases 1-7

---

## Dependency Graph

```
Phase 1 (SQL Editor) ─────────────────────────────────────────────────────────┐
                                                          │       
Phase 2 (Preview Tab) ────────┬───────────────────────────┤   
                              │                           │     
Phase 3 (Config Schema) ──────┴────────┬──────────────────┤       
                                      │                   │     
Phase 4 (Schema Registry) ────────────┴───┬────────────────┤
                                           │              │     
Phase 5 (Metrics System) ──────────────────┴───┬──────────┤
                                               │          │     
Phase 6 (Metric Validation) ───────────────────┴──────────┤
                                                          │       
Phase 7 (AI Context) ─────────────────────────────────────┤ 
                                                          │       
Phase 8 (Integration) ────────────────────────────────────┘   
```

**Parallel Opportunities:**
- Phase 1 and Phase 2 can run in parallel (independent)
- Phase 5 and Phase 7 can partially overlap (metrics doesn't block AI basics)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| information_schema queries slow on large DBs | Medium | Cache schema, async extraction |
| Token limits exceeded with full context | High | Tiered context trimming (Phase 7) |
| Formula parsing edge cases | Medium | Fallback to manual requiredFields entry |
| Breaking changes to Configuration | High | Migration scripts, backward compat |

---

*Roadmap created: 2025-02-07*
*Last updated: 2026-02-11 after Phase 08 planning*
