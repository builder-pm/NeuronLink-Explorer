# NeuronLink: Project Implementation Plan

## 1. Introduction

This document outlines a detailed, task-level plan for evolving the NeuronLink Data Analysis application from its current state as a sophisticated proof-of-concept into a robust, production-ready application. The plan is divided into logical phases, prioritizing foundational work first.

## 2. High-Level Goals

The primary objectives are to:

1.  **Implement a True In-Browser Database:** Transition from mock data and services to a live, in-browser SQL database using WebAssembly for a faster, more powerful user experience.
2.  **Refactor State Management & Add Persistence:** Improve the scalability and maintainability of the frontend architecture and ensure user work is not lost on page reloads.
3.  **Enhance UI/UX:** Elevate the user experience by replacing basic components with professional-grade alternatives and providing better user feedback.
4.  **Ensure Production Readiness:** Harden the application through comprehensive testing, code quality improvements, and accessibility considerations.

---

## 3. Detailed Task Breakdown

### Phase 1: Foundational Architecture & State Management (Highest Priority)

This phase focuses on building the core infrastructure and making the frontend state manageable.

| Task ID | Task Name | Description | Acceptance Criteria / Status | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **1.5** | **Frontend State Refactoring** | Overhaul state management in `App.tsx`. Replace the numerous `useState` hooks with a combination of `useReducer` and React Context for centralized state logic. | **Completed:**<br>- State logic moved to a reducer.<br>- `App.tsx` now uses `useAppState` and `useAppDispatch` from context.<br>- Prop-drilling has been eliminated. | **High** |
| **1.6** | **Implement `localStorage` Persistence** | Create a mechanism (e.g., a custom hook) to automatically save the application's state to `localStorage` on change and rehydrate it on page load. | **Completed:**<br>- `AppProvider` in `state/context.tsx` now hydrates state from `localStorage` on load.<br>- A `useEffect` hook persists state changes back to `localStorage`.<br>- Reloading restores the user's full session context. | **Medium** |


### Phase 2: UI/UX Polish

This phase focuses on improving key UI interactions.

| Task ID | Task Name | Description | Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **2.3** | **Implement Toast Notifications** | Integrate a non-blocking toast notification library (e.g., `react-hot-toast`). Replace all `window.alert()` calls with informative toasts. | **Completed:**<br>- `react-hot-toast` has been integrated.<br>- `window.alert()` calls in `App.tsx` have been replaced with `toast.success()` or `toast.error()`.<br>- Notifications are styled for both light and dark themes. | **Medium** |
| **2.4** | **Upgrade SQL Editor** | Replace the `<textarea>` for the SQL editor with a proper code editor component like Monaco Editor. | **Completed:**<br>- The editor provides SQL syntax highlighting.<br>- The editor's theme syncs with the app's light/dark mode.<br>- The basic `<textarea>` has been fully replaced in `DbModelingPanel.tsx`. | **Medium** |
| **2.5** | **Enhance Join Editor** | Improve `JoinEditorModal.tsx` to guide users. Instead of a plain text input for the `ON` condition, provide dropdowns for columns from the `from` and `to` tables. | **Completed:**<br>- The modal now shows dropdowns for each table, allowing users to select columns to build the `ON` clause, reducing manual error.<br>- The `ON` condition is constructed automatically. | **Low** |

### Phase 3: Advanced Features & Production Hardening

This phase focuses on quality, reliability, and advanced features that make the application truly enterprise-ready.

| Task ID | Task Name | Description | Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **3.1** | **Comprehensive Testing Suite** | Set up a testing framework (e.g., Vitest, React Testing Library). Write unit tests for critical business logic (`performAggregation`, `applyFilters`) and integration tests for key user flows. | **Completed:**<br>- Core data processing functions have been extracted and tested.<br>- The project is now set up for further test development. | **Medium** |
| **3.2** | **SQL Formatting** | Add a "Format SQL" button to the SQL editor. Use a library like `sql-formatter` to automatically clean up and format the user's query for readability. | **Completed:**<br>- Added a "Format" button to the SQL editor panel.<br>- Integrated the `sql-formatter` library to beautify queries.<br>- The button formats the current query in place. | **Low** |
| **3.3** | **Accessibility (A11y) Audit** | Perform a full accessibility audit using browser tools (Lighthouse) and automated checkers (axe). Address all identified issues. | **Completed:**<br>- All icon-only buttons have `aria-label`s.<br>- Inputs have corresponding `<label>` elements.<br>- Modals have `role="dialog"` and can be closed with the Escape key.<br>- Added global `focus-visible` styles for keyboard navigation. | **Medium** |
| **3.4** | **Simulated Backend Service** | Implement a mock backend service to simulate interactions with remote data sources like a data lakehouse. | **Completed:**<br>- `services/backend.ts` created to simulate API calls.<br>- Credentials modal uses this service to test connections.<br>- App fetches "remote" data and loads it into the local DB. | **Medium** |

### Phase 4: In-Browser Database Architecture & Final Features

This phase represents the shift to a fully client-side, high-performance architecture and the implementation of final features.

| Task ID | Task Name | Description | Acceptance Criteria / Status | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **4.1** | **Implement In-Browser Database (sql.js)** | Re-architect the application to use `sql.js`. This involves removing all mock backend services and running a live SQLite database in the browser for all data operations. | **Completed:**<br>- `sql.js` is initialized on app load.<br>- Demo data is loaded into relational tables.<br>- The data grid is now populated by executing real SQL queries against the in-browser DB.<br>- The AI assistant can now generate and execute queries. | **High** |
| **4.2** | **Data Export to XLSX** | Add an "Export" button that allows users to download the current view (processed data) as an Excel file. | **Completed:**<br>- `xlsx` library integrated.<br>- "Export" button added to the UI.<br>- Data is correctly formatted and downloaded. | **High** |
| **4.3** | **Right-Side Panel Layout & UX Refactor** | Re-architect the main layout to place all configuration panels on the right side. Replace the "Configure" button with a sleek, vertical expand/collapse toggle between the panels. Restore the DB credentials modal. | **Completed:**<br>- Main content area is on the left, panels on the right.<br>- A `PanelToggle` component now manages secondary panel visibility.<br>- A gear icon in the DB config panel opens a new `DbCredentialsModal`. | **High** |
| **4.4** | **Lakehouse (Athena) Integration** | Add functionality to connect to a (simulated) Athena data lakehouse, allowing users to switch between the local DB and a remote data source. | **Completed:**<br>- Credentials modal allows selecting 'Athena' and entering credentials.<br>- Credentials are persisted in `localStorage`.<br>- App auto-connects on load if configured.<br>- A mock backend in `services/backend.ts` simulates the connection and data fetch. | **High** |