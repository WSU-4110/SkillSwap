# FR6: View another user's profile

This branch adds the route module. It is not connected to the server yet.
Related GitHub issue: #3.

## Dependencies

Use the team's database connection and login session setup. The database needs
users.id, name, major and bio from the registration/profile work, teaching_skills
from FR4, and learning_skills from FR5. Apply the corresponding SQL scripts first.

## Connect the route

The privacy backend already defines GET /api/users/:userId/profile in server.js.
Replace that existing handler with this module; do not leave two handlers for the
same URL. Keep the existing /api no-store middleware and session middleware.
After the session middleware, before app.listen, add:

```js
app.use('/api/users', require('./routes/user-profile'));
```

GET /api/users/2/profile returns a profile object with id, name, major, bio,
teachSkills and learnSkills. It does not return email, password hashes or session
information. Missing users return 404, invalid IDs 400, and unsigned requests 401.

The frontend user-profile.js currently uses sampleUsers. It still needs to fetch
this endpoint using the login session and use the returned profile object.
Ratings/reviews and public profile images are not implemented by this module;
coordinate these with their respective feature owners if required by the SRS.

## Validation

Syntax and isolated handler checks are performed before this commit. Actual
MySQL execution, session integration and frontend tests remain pending. Do not
merge as a completed feature until those checks pass.
