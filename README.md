# NeuronLink

**NeuronLink** is an enterprise-grade **Universal Data Intelligence** platform designed to democratize data access. It bridges the "Analytic Gap" by introducing a **Semantic Context Layer** that enables an AI query engine to understand business logic, not just raw SQL.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Stack](https://img.shields.io/badge/stack-React_Typescript_Supabase-purple.svg)

## � The Vision
Modern data warehouses (Snowflake, BigQuery, Postgres) are technical bottlenecks. NeuronLink enables business users to converse with their data across any warehouse using a secure, governed semantic layer.

---

## 🚀 Core Product Pillars

### 1. Semantic Context Engine
We bridge the semantic gap using a **Schema Registry**. 
- **Automated Discovery**: Auto-extracts relationships from the warehouse (utilizing a custom RPC on Supabase for robust metadata extraction).
- **Business Aliasing**: Map cryptic columns to human-readable business terms.
- **AI RAG-Lite**: We inject field descriptions and cached sample values into AI prompts to eliminate hallucinations.

### 2. Visual Data Modeler
A node-based "Canvas" that treats SQL as a graph state.
- **Deterministic Generation**: The visual model is the direct input for our SQL compiler (`utils/dataProcessing.ts`).
- **Drift Detection**: Automatically hashes and monitors physical schema changes, alerting admins to "Semantic Drift".

### 3. Unified Metrics & Analytics
- **Metric Layer**: Define KPIs (ARR, LTV) once; reuse everywhere with built-in field validation.
- **Product Analytics**: Every interaction is logged to a persistent `user_events` schema for auditing and usage analysis.
- **Session Tracking**: Uses unique session IDs to group events into coherent user discovery journeys.

## 🏗️ Technical Architecture

NeuronLink uses a **Hybrid Compute** model:
*   **Production**: Live Supabase (Postgres) connection with Row Level Security.
*   **Demo/Simulation**: Local WASM-based SQLite (`sql.js`) for zero-latency testing.
*   **Cloud Warehouses**: Currently supports AWS Athena via high-fidelity simulation (designed for modular enterprise adapters).
*   **AI Engine**: NVIDIA AI Foundation via server-side edge proxy.

### 📊 Sample Dataset
The platform includes the **`dvdrental`** PostgreSQL sample dataset, utilized as the canonical benchmark for our Semantic Layer and Metric validation tests.

## �️ Getting Started

### Prerequisites
*   Node.js v18+
*   Supabase Account (for persistence & auth)
*   NVIDIA API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone git@github.com:builder-pm/Neuron-Link.git
    cd Neuron-Link
    npm install
    ```

2.  **Environment Setup**
    Create `.env.local`:
    ```env
    VITE_NVIDIA_API_KEY=your_key
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_key
    ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```

## 🎨 Design Philosophy: "Cyber Brutalism"
NeuronLink rejects "soft" SaaS aesthetics. We use a **Brutalist** system (High-contrast `#CAFF58` Lime, Hard Borders, and Dark Mode) to prioritize **information density** and power-user speed.

---

## 👨‍💻 Deep Dive
For a comprehensive analysis of the architectural decisions, trade-offs, and implementation details, see our **[Product Deep Dive](file:///C:/Users/naman/.gemini/antigravity/brain/7cdad4f4-5b8b-4743-99d1-cfb8a2cdeeba/product_deep_dive.md)**.

*Built by [Naman Kansal](https://namankansal.in)*
