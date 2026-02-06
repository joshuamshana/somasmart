# Teacher Upload UX Audit (Dashboard + Lessons + Creator)

Date: 2026-02-06

## Identified UX problems
- Dashboard information hierarchy was mixed: metrics, attention items, and notifications competed equally without a clear “what should I do next” action.
- Dashboard metric cards used a dense 6-column layout too early (`md`), causing cramped cards on medium screens.
- Lessons management relied on a table-only pattern, which reduced usability on small screens.
- Upload/creator “Blocks” step mixed many equal-weight actions in one row, making first-time authoring flow unclear.
- Gate authoring context was visually buried beneath component editing and harder to scan on small screens.

## UX requirements derived from the audit
- Add predictive “Suggested next step” guidance to dashboard and lessons pages.
- Improve responsive grid breakpoints for dashboard metrics and panel composition.
- Provide responsive parity for lessons management (mobile cards + desktop table).
- Introduce template-first, progressive authoring controls in the creator.
- Keep quiz gate controls persistently discoverable and readable across breakpoints.

These requirements are tracked as `REQ-2101` through `REQ-2106` in `docs/requirements.md`.

## External UX references used
- Material Design stepper/progressive-disclosure guidance: https://m1.material.io/components/steppers.html
- USWDS process list pattern (task sequencing and hierarchy): https://designsystem.digital.gov/components/process-list/
- NHS service manual question-page pattern (single decision/action per step): https://service-manual.nhs.uk/design-system/patterns/question-pages
- W3C WCAG 2.1 Reflow (responsive layout without loss of information): https://www.w3.org/WAI/WCAG21/Understanding/reflow.html
