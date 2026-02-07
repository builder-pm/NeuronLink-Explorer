# NeuronLink Lakehouse - DB Configuration & Semantic Context Enhancement

## What This Is

A data lakehouse analysis platform that allows users to connect databases, build custom data models by selecting tables/fields, define semantic context for AI-assisted querying, and analyze data through pivot tables and visualizations. This enhancement focuses on fixing DB configuration issues and implementing a complete semantic context system (both global master and per-model localized contexts).

## Core Value

Users can define semantic meaning for their data models — including table relationships, field descriptions, and business metrics — enabling an AI assistant to accurately understand and query their specific data structure without hallucinating non-existent fields.

## Requirements

### Validated

- ✓ Database connection (SQLite, Athena, Supabase) — existing
- ✓ Table/field discovery from connected database — existing
- ✓ Visual data model canvas with drag-drop tables — existing
- ✓ Join definition between tables — existing
- ✓ Field aliasing (rename fields) — existing
- ✓ AI chat assistant with basic semantic context — existing
- ✓ Configuration save/load to Supabase — existing

### Active

#### SQL Editor Issues
- [ ] **SQL-01**: SQL query results display as tabular output below the query editor in SQLPanel
- [ ] **SQL-02**: Results table shows column headers and row data with proper styling

#### Preview Tab (Analysis Preview)
- [ ] **PREV-01**: Preview tab shows how fields will appear in Table View page
- [ ] **PREV-02**: Users can rename field display names inline in preview
- [ ] **PREV-03**: Users can drag fields into groups (collapsible folders)
- [ ] **PREV-04**: Users can reorder fields via drag-drop
- [ ] **PREV-05**: Users can hide/show fields (toggle visibility without removing from model)

#### Semantic Context - Per-Model (Localized)
- [ ] **SEM-01**: Store which tables and fields are selected in a semantic context
- [ ] **SEM-02**: Store how tables connect (joins) — can include non-PK-FK joins
- [ ] **SEM-03**: Store field metadata: description, data type hint (dimension/measure/date/identifier)
- [ ] **SEM-04**: Store field sample values (auto-scanned distinct values)
- [ ] **SEM-05**: Store business aliases for fields
- [ ] **SEM-06**: Localized joins ADD ALONGSIDE global PK-FK (both available for queries)
- [ ] **SEM-07**: Persist semantic contexts to Supabase

#### Master Semantic Context (Global)
- [ ] **MAST-01**: Extract PK-FK relationships LIVE from Supabase information_schema
- [ ] **MAST-02**: Store table descriptions (required for each table)
- [ ] **MAST-03**: Store global list of supported metrics
- [ ] **MAST-04**: Each metric defines required fields needed to calculate it
- [ ] **MAST-05**: Validate if a metric can be queried from a smaller DB model
- [ ] **MAST-06**: When model missing metric's required fields, suggest additions to user

#### Metrics System
- [ ] **METR-01**: Simple metrics via formula builder (pick fields, choose aggregation)
- [ ] **METR-02**: Complex metrics via SQL expression (e.g., SUM(amount) - SUM(cost))
- [ ] **METR-03**: Each metric has: name, formula/expression, description, format, required fields

#### AI Assistant Enhancement
- [ ] **AI-01**: AI has access to current model (active tables/fields)
- [ ] **AI-02**: AI has access to global schema (for suggesting model changes)
- [ ] **AI-03**: AI has access to semantic descriptions (field/table descriptions)
- [ ] **AI-04**: AI has access to sample values (for filter suggestions)

### Out of Scope

- Real-time collaborative editing — complexity for v1
- Version history for semantic contexts — defer to v2
- Custom SQL functions/UDFs — not needed for semantic context
- Export to BI tools (Tableau, PowerBI) — future integration

## Context

### Technical Environment
- React + TypeScript + Vite frontend
- Supabase for backend (auth, storage, database)
- Monaco Editor for SQL editing
- React-DnD for drag-drop functionality
- OpenRouter API for AI (currently using glm-4.5-air model)
- sql.js for client-side SQLite (demo mode)

### Existing Architecture
- `types.ts` has `SemanticContext`, `ModelConfigurationV2`, `Metric` interfaces (partially implemented)
- `ContextPanel.tsx` and `MetricsPanel.tsx` are stub components
- `MasterView.tsx` orchestrates the modeling view with panels
- `SQLPanel.tsx` lacks results display (only editor)
- `FieldGroupingPanel.tsx` exists but not integrated into Preview tab

### Database Schema
- Using dvdrental PostgreSQL schema with well-defined PK-FK relationships
- 16 tables: actor, film, inventory, customer, rental, payment, store, address, city, country, category, film_category, film_actor, language, staff

## Constraints

- **Database**: Must work with Supabase PostgreSQL (live PK-FK extraction from information_schema)
- **Performance**: Sample value scanning should be async and cached, not block UI
- **Backward Compatible**: Existing saved configurations must continue to work
- **AI Token Limits**: Semantic context sent to AI must be summarized to fit token limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local joins add alongside global | Flexibility for ad-hoc analysis while preserving canonical relationships | — Pending |
| PK-FK from live DB, not SQL file | Always current, no manual sync needed | — Pending |
| Metrics suggest additions when fields missing | Better UX than hiding; educates user | — Pending |
| All field metadata (desc, type, samples, alias) | Comprehensive context for AI accuracy | — Pending |
| Supabase storage | Consistent with existing config storage | — Pending |

---
*Last updated: 2025-02-07 after initialization*
