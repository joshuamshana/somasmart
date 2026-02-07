# UI Modernization Requirements (No Logic Changes)

Date: 2026-02-07  
Scope: Visual/UI/UX modernization only. Business logic, data model, and route behavior must remain unchanged.

## 1) Audit Evidence (Regression Screenshots)
- Public:
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/public-learn-large.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/public-learn-small.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/public-login-large.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/public-login-small.png`
- Student:
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/student-lessons-large.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/student-lessons-medium.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/student-lessons-small.png`
- Teacher:
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/teacher-builder-large.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/teacher-builder-medium.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/teacher-builder-small.png`
- Admin:
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/admin-lessons-large.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/admin-lessons-medium.png`
  - `/Users/joshuamshana/Documents/SomaSmart/output/playwright/ui-audit/admin-lessons-small.png`

## 2) Current Design Philosophy and Structure (Observed)
- Strong role-based shell architecture with consistent sidebar/drawer pattern (`public`, `student`, `teacher`, `admin`, `school`).
- Tokenized foundation already exists (semantic color, radius, shadow tokens) and Tailwind is mapped to tokens.
- Component model is reusable and stable (`Card`, `Button`, `DataTable`, `PageHeader`, `Toolbar`, `SidebarNav`).
- Current visual language is functional/minimal but low-emphasis: weak hierarchy, limited typography scale, limited spacing rhythm, low “product polish” for public-facing education UX.
- Responsive behavior is structurally correct but mostly “stacked fallback” on small screens, not experience-optimized responsive choreography.

## 3) Conclusion on Current UI
- Architecture quality: good.
- Design-system maturity: intermediate (tokenized base exists, but visual strategy is not differentiated).
- UX maturity: operational for admin workflows, below modern benchmark for public learning experience.
- Biggest opportunity: upgrade information hierarchy, visual density strategy, and breakpoint-specific interaction models while keeping existing logic/routes intact.

## 4) Target Modernization Goals
- Enterprise-grade internal UX for admin/teacher/student back-office workflows.
- Consumer-grade public learning UX comparable to leading learning platforms (clear hero/value, content discovery, trust, progression cues).
- “Paper paradigm” section separation: each major content region appears as a deliberate surface layer with clear elevation, spacing, and semantic grouping.
- Breakpoint-first behavior: large, medium, small each gets intentional layout patterns, not just resized desktop.

## 5) Requirements

### 5.1 Design System and Hi-Fi Foundation
- UI-REQ-001: Define a full semantic token matrix for light/dark and role contexts: `surface/base/raised/overlay`, `text/heading/body/subtle`, `interactive/default/hover/active/focus/disabled`, `status`.
- UI-REQ-002: Introduce typography scale tokens with explicit display/headline/title/body/caption roles and consistent line-height.
- UI-REQ-003: Add spacing scale and section rhythm rules (8px base grid; fixed vertical cadence per page type).
- UI-REQ-004: Add motion primitives (`fast`, `base`, `slow`) and easing standards for drawers, section transitions, and status feedback.
- UI-REQ-005: Convert existing shared UI components to consume upgraded tokens only; no hardcoded palette utilities in feature pages.

### 5.2 Paper Paradigm (Section Separation)
- UI-REQ-010: Every page must use a 3-layer paper model:
  - Layer 1: page canvas/background context.
  - Layer 2: primary section papers (hero, filters, content lists, analytics blocks).
  - Layer 3: nested action papers (toolbars, inline actions, side panels).
- UI-REQ-011: Each paper layer must have distinct elevation, border contrast, and padding contract.
- UI-REQ-012: Related controls and data must be grouped in a shared paper, avoiding scattered standalone widgets.

### 5.3 Public Learning Experience (Udemy-Class Standard)
- UI-REQ-020: Replace utility-style public landing composition with a modern learning storefront structure:
  - Hero/value proposition.
  - Featured/recommended lesson rails.
  - Curriculum browse and filters.
  - Social proof/trust section.
- UI-REQ-021: Public login/register should share branded auth shell (visual continuity, concise guidance, strong CTA hierarchy).
- UI-REQ-022: Lesson cards must include richer metadata hierarchy (difficulty, duration, outcomes, access state) using structured card zones.
- UI-REQ-023: Discovery and conversion actions must remain visible above fold on large and medium screens.

### 5.4 Large / Medium / Small Breakpoint Requirements
- UI-REQ-030: Breakpoints:
  - Large: `>=1280px`
  - Medium: `768px-1279px`
  - Small: `<=767px`
- UI-REQ-031: Large-screen workflows requiring comparison/editing (teacher builder, admin lesson review) must use split-view or multi-pane layout by default.
- UI-REQ-032: Medium screens must preserve parallel context where possible (2-column priority panels before full stacking).
- UI-REQ-033: Small screens must use progressive disclosure (sticky action bar, collapsible filters, step-based navigation hints).
- UI-REQ-034: For every critical task, provide explicit “large-mode” and “small-mode” interaction spec in Hi-Fi artifacts.

### 5.5 Role-Specific UX Requirements
- UI-REQ-040: Student lesson discovery: convert filter and lesson list into clearer “find + continue” experience with stronger progress signaling.
- UI-REQ-041: Teacher builder: optimize for production workflow with persistent stepper context and clear primary action hierarchy.
- UI-REQ-042: Admin lesson review: ensure high-density oversight on large screens and clear decision flow on small screens.
- UI-REQ-043: All role dashboards must prioritize “next best action” and status summaries in first viewport.

### 5.6 Enterprise Interaction Standards
- UI-REQ-050: Table/list actions must follow a consistent action stack: `primary`, `secondary`, `destructive` with predictable placement.
- UI-REQ-051: Empty/loading/error states must be redesigned as branded, actionable states with explicit next steps.
- UI-REQ-052: Accessibility baseline must be retained or improved (focus visibility, contrast, hit targets, keyboard operability).
- UI-REQ-053: Maintain existing route/query/state behavior; UI refactor must be presentation-layer only.

## 6) Hi-Fi Deliverables (Required Before Implementation)
- UI-REQ-060: Provide Hi-Fi screen set for each role and each breakpoint class (large/medium/small).
- UI-REQ-061: Provide component spec sheets (states, spacing, typography, color roles, motion behavior).
- UI-REQ-062: Provide interaction flows for:
  - Public browse -> login -> lesson access.
  - Student lessons discovery.
  - Teacher lesson creation and submission.
  - Admin lesson review and decision.
- UI-REQ-063: Provide responsive behavior annotations per screen (what collapses, what persists, what pins/sticks).

## 7) Acceptance Criteria
- UI-REQ-070: New visual regression snapshots pass for all defined audit screens across large/medium/small.
- UI-REQ-071: No logic regression in unit/e2e behavior flows.
- UI-REQ-072: All high-priority tasks complete within the same click/step count as current implementation or better.
- UI-REQ-073: Public-facing pages show clear visual differentiation from internal admin shells while remaining brand-consistent.
