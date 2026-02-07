# SomaSmart Hi-Fi UI Spec (Critical Surfaces)

Date: 2026-02-07

## Design Direction
- Theme: Modern EdTech trust.
- Public UI: conversion-friendly, confidence-building, clear progression to registration/login.
- Internal UI (student/teacher/admin): enterprise clarity with high scanability and predictable actions.

## Token System

## Surface and Layering
- `surface-canvas`: global app background.
- `surface-paper`: primary card/panel layer.
- `surface-paper-2`: secondary grouped layer.
- `surface-inset`: tertiary inset/action layer.
- Paper contract:
  - Primary: high-priority sections and page containers.
  - Secondary: grouped controls and supporting modules.
  - Inset: nested controls/status blocks.

## Typography
- Display: major hero statements.
- H1/H2/H3: page and section headings.
- Body: standard content.
- Caption: metadata and micro labels.
- Rules:
  - Heading text always uses `text-title`.
  - Descriptive content uses `text-body`.
  - Supporting metadata uses `text-subtle`.

## Action and Status Tones
- Primary action: `action-primary-*`.
- Secondary action: `action-secondary-*`.
- Status:
  - Success: `status-success*`
  - Warning: `status-warning*`
  - Danger: `status-danger*`
  - Info: `status-info*`

## Motion
- Duration tokens:
  - Fast: `120ms`
  - Base: `220ms`
  - Slow: `340ms`
- Drawer/modal transitions use `ease-emphasis` for entry and `ease-standard` for exit.

## Breakpoint Behavior
- Large (`>=1280`):
  - Persistent sidebar + multi-pane content for operational pages.
  - Decision/action panels visible in first viewport for critical flows.
- Medium (`768-1279`):
  - Maintain two-column layouts where context matters.
  - Avoid single-column collapse until necessary.
- Small (`<=767`):
  - Compact header with drawer.
  - Progressive disclosure for filters and secondary controls.
  - Sticky action bars for step-based tasks.

## Critical Screen Notes

## Public Learn (`/`)
- Structure:
  - Hero/value section.
  - Metrics/trust strip.
  - Featured lesson rail.
  - Discovery area (filters + results).
- Small screen:
  - Filters collapsed in `<details>`.
  - Featured and trust cards remain scroll-first.

## Public Login/Register (`/login`, `/register`)
- Branded shell with contextual trust panel on large screens.
- Form remains primary on all sizes.
- Error states shown inline with status tone.

## Student Lessons (`/student/lessons`)
- “Find + Continue” layout:
  - Top summary metrics.
  - Left filter panel, right results list on medium/large.
  - Collapsible filters on small.
- Lesson cards:
  - Primary metadata first.
  - Learning state + CTA cues.
  - Access status clearly separated.

## Teacher Builder (`/teacher/lessons/new`, edit)
- Left: workflow context + autosave status.
- Right: active step editing surface.
- Sticky action bar on small for step navigation.
- Keep existing metadata/blocks/preview/submit logic and step flow.

## Admin Lessons Review (`/admin/lessons`)
- Left queue for pending/approved selection.
- Right review panel with preview, metadata, feedback, and decision actions.
- Selected-state emphasis for queue items.
- Small screen follows sequence: summary -> queue -> review.

## Accessibility Requirements
- Keyboard focus clearly visible via focus ring token.
- Touch targets remain >= 40px height for primary form/action controls.
- Status and state cues are color + text (never color-only).
