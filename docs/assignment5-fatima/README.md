# Assignment 5 - Fatima Khiari

Framework: Jest 30.5.2. Branch: `Fatima_unittest`.

## Six selected methods

| Feature | Class | Method | Test file |
| --- | --- | --- | --- |
| FR4 | TeachingSkillsController | listSkills | teaching-list.test.js |
| FR4 | TeachingSkillsController | addSkill | teaching-add.test.js |
| FR5 | LearningSkillsController | listSkills | learning-list.test.js |
| FR5 | LearningSkillsController | addSkill | learning-add.test.js |
| FR6 | UserProfileController | getProfile | public-profile.test.js |
| FR7 | SkillMatchesController | findMatches | skill-matches.test.js |

Existing route handlers were moved into these controller classes so each operation can be tested directly. Database access is injected through the constructor and mocked with `jest.fn()`. The routes retain their login middleware. The garbled FR4 length-validation message was corrected to `1-100 characters`.

## Run

Use Node.js 20.9 or newer (the existing sharp dependency requires it).

```bash
cd backend
npm ci
npm run test:fatima
npm run test:fatima:coverage
```

For one method, for example:

```bash
npm run test:fatima -- --verbose --runTestsByPath tests/fatima/teaching-list.test.js
```

Run each of the six files in the table separately to take six terminal screenshots. The report's result images reproduce saved execution logs; they are not native terminal screenshots.

To regenerate raw evidence from the repository root:

```bash
node docs/assignment5-fatima/run-results.cjs
```

## Scope

The six suites contain 55 test cases. They cover normal/empty results, invalid input, length boundaries 0/1/100/101, normalized names, duplicates, private-field exclusion, grouping matches, and database failures. Coverage applies only to the four controller files, not the whole application. SQL is checked as a query contract with mocked results; a live MySQL instance is not exercised by these unit tests. Login middleware is outside these six methods.

The existing request tests use Node's test runner and are excluded from this Jest configuration. They remain unchanged. No teammate's selected FR3, FR9, FR10-12, FR17, FR18, FR19, or NFR5 tests are modified.
