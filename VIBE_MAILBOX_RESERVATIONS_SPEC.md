# /vibe Mailbox + File Reservations (Spec Draft)

This is a minimal, local-first extension to /vibe for async coordination
and edit-intent signaling. It complements the existing presence + DMs.

## Goals
- Add a mailbox-style inbox/outbox for asynchronous threads.
- Provide advisory file reservations (leases) to avoid collisions.
- Keep storage local by default; optional hosted sharing later.

## Storage Layout (local-first)

```
~/.vibe/
  mailbox/
    threads/
      bd-123.jsonl
    index.json
  reservations/
    active.jsonl
    history.jsonl
```

Notes:
- JSONL entries are append-only for simple auditability.
- `index.json` caches unread counts and recent threads.

## MCP Tools

### Mailbox
1) `send_mail(thread_id, subject, body_md, ack_required=false, expires_ts?)`
2) `fetch_mailbox(thread_id?, limit=20, unread_only=false)`
3) `ack_message(message_id)`

### File Reservations
1) `reserve_files(paths, ttl_seconds=3600, exclusive=true, thread_id?, reason?)`
2) `release_reservation(reservation_id)`
3) `list_reservations(active_only=true, path_filter?)`

## Data Shapes

Mailbox entry:
```json
{
  "message_id": "msg-20260106-001",
  "thread_id": "bd-123",
  "subject": "[bd-123] Start: lock files",
  "body_md": "Taking `api/auth.ts` and `api/session.ts`.",
  "ack_required": true,
  "created_ts": "2026-01-06T12:10:00Z",
  "from": "@alice",
  "to": "@bob"
}
```

Reservation entry:
```json
{
  "reservation_id": "rsv-9f3a",
  "thread_id": "bd-123",
  "paths": ["api/auth.ts", "api/session.ts"],
  "exclusive": true,
  "reason": "Fix auth race",
  "issued_ts": "2026-01-06T12:05:00Z",
  "expires_ts": "2026-01-06T13:05:00Z",
  "released_ts": null,
  "owner": "@alice"
}
```

## Behavior (MVP)

- `reserve_files` warns on local overlap if `exclusive=true`.
- `fetch_mailbox` returns newest-first with optional thread filter.
- `ack_message` flips unread -> read in `index.json`.
- All timestamps are UTC ISO8601.

## Optional Integration Points

- If AIRC payloads are present, mirror them to mailbox/reservation logs.
- Optional hosted sync: post mailbox and reservation entries to `/api/messages` and `/api/reservations`.

## Non-Goals (MVP)

- Hard locks or enforced blocking.
- Attachments.
- Cross-repo federation.
