# Duplicate request prevention

This follows PR #51. It adds a database constraint and handles its duplicate-key response in the existing send endpoint. The PR targets the FR10 branch to show only these follow-up changes; after #51 merges, retarget this PR to main.

## Setup

1. Import `database/add-swap-requests.sql` from #51 if it has not been imported.
2. Import `database/prevent-duplicate-requests.sql` once.
3. Restart the backend with this version of the send route.

Only one pending request can exist per pair of students, in either direction. Concurrent duplicate sends are rejected by a unique database index, not by a separate check that can race. The API returns 409 for the duplicate. Accepted and rejected rows use a NULL pending marker so their history is preserved and another request can be sent later. Accepting or rejecting a pending request automatically releases the unique pending-pair slot.

The migration does not delete existing rows. Before applying it to an existing database, check for duplicate pending pairs:

```sql
SELECT LEAST(sender_id, recipient_id) AS user_a,
       GREATEST(sender_id, recipient_id) AS user_b,
       COUNT(*) AS pending_count
FROM swap_requests
WHERE status = 'pending'
GROUP BY user_a, user_b
HAVING COUNT(*) > 1;
```

If this returns rows, have the team review which pending request should remain before changing any records. Do not repeatedly import the ALTER TABLE migration after it succeeds.

## Verification

Run `node --test backend/tests/requests.test.js`. Seven tests cover authentication, invalid/self recipients, missing recipients, sender identity, database failures, duplicate-key handling, and simulated concurrent duplicate sends. The database is mocked; this does not prove MySQL constraint behavior.

Before marking ready, test against MySQL with #51, #52, and #53 integrated:
- A sends to B: 201 and one pending row.
- A sends again, or B sends to A: 409 and still one pending row.
- Two simultaneous sends (including opposite directions): one 201, one 409.
- B accepts or rejects: only that pending request changes; a new request can then be sent and prior rows remain unchanged.
- A and a third user cannot respond to B's incoming request.
- Concurrent accept/reject: only one update succeeds and the other returns 409.

Frontend integration and actual MySQL execution are still pending.
