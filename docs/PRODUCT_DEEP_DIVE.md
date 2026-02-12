# NeuronLink: Product & Architectural Deep Dive

This document outlines the core logic and strategic decisions invested in the NeuronLink platform.

## 1. The Core Philosophy: "Semantics over SQL"
NeuronLink is built on the premise that the barrier to data-driven decision-making isn't just "not knowing SQL"—it's a lack of **business context** in raw schemas. 

### Decision: The Schema Registry
Instead of querying the database directly, NeuronLink uses a `Schema Registry`. 
- **Rationale**: Live databases often lack descriptions. By persisting a metadata layer, we allow Admins to "attach" business meaning to cryptic column names.
- **Implementation**: We use a `syncSchemaRegistry` service that extracts PK-FK relationships and caches distinct sample values to inform the AI assistant.

## 2. Technical Decisions & Trade-offs

### Hybrid Data Engine (SQLite + Supabase)
- **Problem**: Users want a "Zero-Setup" experience but need Enterprise persistence.
- **Solution**: We implemented `sql.js` (SQLite in WASM) for the local Demo mode (using the `dvdrental` dataset) while supporting a live Supabase connection for production-ready persistence.
- **Simulated AWS Athena**: To demonstrate the "Lakehouse" potential without requiring costly cloud infrastructure in dev, Athena is currently implemented as a high-fidelity simulation with modeled latency.

### Visual State as the Source of Truth
- **Decision**: The Modeling Canvas is not just a UI; it is the **compiler input**.
- **Execution**: The `generateQuery` utility in `utils/dataProcessing.ts` traverses the node graph and active filters to deterministically generate optimized SQL. This prevents the "Black Box" issue common in other No-Code tools.

### Deterministic AI (NVIDIA AI Foundation)
- **Decision**: Never send a blind prompt to the LLM.
- **Implementation**: We inject the `SemanticContext` (Aliased field names, sampled values, and validated joins) into every prompt. We leverage the **NVIDIA AI Foundation** endpoints via a server-side proxy to provide low-latency, high-precision text-to-SQL generation. This forces the AI to operate within the "guardrails" of the existing data model, drastically reducing hallucinations.

## 3. Operations & Analytics

### Product Analytics Strategy
We log every significant user action (Logins, Query Executions, Model Updates) to a `user_events` table. 
- **Decision**: Even though a `neuronlink_analytics` schema exists in migrations, we log to the `public` schema in the codebase to bypass complex RLS/PostgREST configuration issues during early-stage development.
- **Session ID**: Every page load generates a unique `sessionId` to group events into a coherent User Journey.

### Schema Drift Detection
- **Problem**: Databases change; models break.
- **Solution**: On every connection, we hash the incoming schema and compare it against the registry's `schema_hash`. If they diverge, a `SCHEMA_DRIFT` event is logged, informing the Admin that the model needs an update.

## 4. Design Aesthetics: Cyber-Brutalism
- **Decision**: Reject the "SaaS Pastel" trend.
- **Rationale**: High-contrast dark modes with monospaced typography aren't just an aesthetic choice; they maximize **information density** and reduce eye strain for power users spending hours in data analysis.
