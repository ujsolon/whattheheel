---
title: 'Activate US1.3 Registration CTA'
type: 'feature'
created: '2026-08-17'
status: 'done'
route: 'one-shot'
---

# Activate US1.3 Registration CTA

## Intent

**Problem:** US1.3 still rendered its post-interaction AI Stylist handoff as a disabled placeholder after US2.1 delivered registration at `/register`.

**Approach:** Replace the placeholder with an explicitly labelled registration link, cover its interaction gate and destination, and reconcile both story records. Post-auth AI Stylist continuation remains owned by later Epic 2 stories.

## Suggested Review Order

**User handoff**

- Activates the existing post-interaction surface with an honest registration destination.
  [`OverlayCanvas.tsx:292`](../../app/components/OverlayCanvas.tsx#L292)

**Cross-story contract**

- Records when US2.1 activates the previously unavailable US1.3 handoff.
  [`1-3-anonymous-manual-overlay-preview.md:56`](1-3-anonymous-manual-overlay-preview.md#L56)

- Reconciles US2.1's original scope record with its post-completion integration.
  [`2-1-user-registration-login.md:212`](2-1-user-registration-login.md#L212)

**Regression coverage**

- Verifies the CTA remains gated until interaction and targets `/register`.
  [`OverlayCanvas.test.tsx:228`](../../app/components/__tests__/OverlayCanvas.test.tsx#L228)
