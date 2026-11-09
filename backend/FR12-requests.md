# Reject a swap request

Related to FR12. Depends on FR10's `database/add-swap-requests.sql`: merge the send-request PR and import that migration first. This branch starts from main and does not duplicate the FR10 files.

Send `PATCH /api/requests/:requestId/reject` with the recipient's login session. No JSON body is required. The frontend must use `credentials: 'include'`.

Success returns HTTP 200 with a confirmation message and `request: { id, status: 'rejected' }`. Only the logged-in recipient can change a pending request. The sender and unrelated users receive the same 404 as a missing request. Invalid IDs return 400, logged-out users receive 401, and previously handled requests return 409. Database errors return 500 without exposing database details.

The conditional SQL update changes just this request and will not overwrite an accepted or rejected request, including when two responses arrive at the same time. Other exchanges between the users remain unchanged. Messaging and scheduling must check for an accepted request server-side; this PR does not implement those separate features or connect the frontend.

## Verification

Run `node --test backend/tests/reject-request.test.js`. These isolated tests simulate the database and check authentication, recipient-only access, request IDs, successful responses, handled requests, and failed updates. They do not verify actual MySQL execution.

Before marking the PR ready, test using MySQL and three accounts: send a request from A to B; verify A and C cannot reject it; log in as B and reject it; check its saved status; verify another response gets 409 and other requests stay unchanged. Also test with no login and an unavailable database. Test concurrent accept/reject requests after both endpoints are integrated; only one should succeed.
