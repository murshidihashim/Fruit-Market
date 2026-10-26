# Fruit Market · Cumulative decision register

Updated 2026-10-26 13:45 (Asia/Kuala_Lumpur). Approval status and delivery status are tracked separately. Only the owner's explicit confirmation sets "Approved".

## Current decisions and pending approvals

| ID | Decision | Approval status | Delivery | Source |
|---|---|---|---|---|
| DEC-001 | Adopt workflow guide 1.2 for Fruit Market | Proposed | In progress | REP-001 |
| DEC-002 | Package A scope = PLAN-001 | Approved (owner, 2026-10-26) | Verified, A4 pending owner | REP-001, REP-002 |
| DEC-003 | Production deploys only on manual Deploy after `verify` | Approved (owner, 2026-10-26) | Verified | REP-001, REP-002 |
| DEC-004 | PDF exports via pandoc + existing Playwright browser | Proposed | In use | REP-001 |
| DEC-005 | RM500/month portfolio ceiling; Fruit Market spend unknown | Proposed (assumption) | Not started | REP-001 |
| DEC-006 | Preview = separate staging Worker (per-version URLs don't support Durable Objects) | Awaiting confirmation | Implemented | REP-002 |

## History (chronological)

- 2026-10-26 13:15 · REP-001 created: DEC-001 to DEC-005 proposed.
- 2026-10-26 13:20 · Owner: "Approve PLAN-001 only, including its listed tests and documentation" → DEC-002 and DEC-003 approved.
- 2026-10-26 13:45 · REP-002: PLAN-001 implemented and verified (A4 pending the owner). DEC-006 recorded, awaiting confirmation. Earlier work (M0–M2, studio audit) predates this register and is recorded in `docs/studio/09` and `10` and in git history.

---

The full reports follow.
