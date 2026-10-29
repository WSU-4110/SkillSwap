# FR7: Match users by skills

This branch adds the route module. It is not connected to the server yet.
Related GitHub issue: #5 (FR7).

## Dependencies

Use the team's db.js and login session setup, the users table with the major
column from profile setup, teaching_skills from FR4 and learning_skills from FR5.
Apply those features' SQL scripts before using this route.

After the server's session middleware, before app.listen, add:

```js
app.use('/api/matches', require('./routes/skill-matches'));
```

Keep the existing /api no-store middleware from the privacy work.

## Request and response

GET /api/matches requires a login session. The response contains users and a
message. Each user has id, name, major and matchingSkills (an array of names).
Only other users who teach a skill the current user wants to learn are included.
A reciprocal match is not required. Matching ignores case and surrounding spaces;
the binary collation after lowercasing avoids also treating accented names as
identical. Each matching user appears once, even if several skills match.

No learning skills and no matching teachers have separate messages. Database
failures return 500; unsigned requests return 401. No email or password fields
are returned.

The frontend browse.js currently uses sample users and localStorage. It still
needs to fetch this endpoint with the login session and use matchingSkills.
This route supplies matches, not a general list of all users.

## Validation

Syntax and isolated handler checks are performed before this commit. They cover
login checks, empty states, grouping multiple matches and database errors using
stubbed database results. They do not execute the SQL.

Still test against MySQL: Python/python and surrounding-space matches, unrelated
skills, accented names, excluding yourself, and several matches for one user.
Session and frontend integration also remain pending. Keep the PR in draft until
integration and actual database tests pass.
