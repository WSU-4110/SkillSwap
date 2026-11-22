const Controller = require('../../controllers/SkillMatchesController');
const { setup, databaseFailure } = require('./helpers');
afterEach(() => jest.restoreAllMocks());
describe('SkillMatchesController.findMatches', () => {
  test('skips matching when the user has no learning skills', async () => {
    const { controller, db, req, res } = setup(Controller);
    db.execute.mockResolvedValueOnce([[]]);
    await controller.findMatches(req, res);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute).toHaveBeenCalledWith('SELECT id FROM learning_skills WHERE user_id = ? LIMIT 1', [7]);
    expect(res.body).toEqual({ users: [], message: 'Add a skill you want to learn to find matches.' });
  });
  test('returns the no-matches response when no teacher matches', async () => {
    const { controller, db, req, res } = setup(Controller);
    db.execute.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([[]]);
    await controller.findMatches(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ users: [], message: 'No matching users are available yet.' });
  });
  test('groups several matching skills into one result per student', async () => {
    const { controller, db, req, res } = setup(Controller);
    db.execute.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([[
      { id: 2, name: 'Alex', major: 'CS', matchingSkill: 'Java' },
      { id: 2, name: 'Alex', major: 'CS', matchingSkill: 'SQL' },
      { id: 3, name: 'Sam', major: null, matchingSkill: 'SQL' }
    ]]);
    await controller.findMatches(req, res);
    expect(res.body).toEqual({ users: [
      { id: 2, name: 'Alex', major: 'CS', matchingSkills: ['Java', 'SQL'] },
      { id: 3, name: 'Sam', major: null, matchingSkills: ['SQL'] }
    ], message: '' });
  });
  test('requests normalized matching for the session user and excludes self', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.query = { userId: 999 };
    db.execute.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([[]]);
    await controller.findMatches(req, res);
    const [sql, values] = db.execute.mock.calls[1];
    expect(values).toEqual([7, 7]);
    expect(sql).toContain('l.user_id = ? AND u.id <> ?');
    expect(sql).toContain('LOWER(TRIM(t.name))');
    expect(sql).toContain('LOWER(TRIM(l.name))');
  });
  test.each([1, 2])('returns a generic error if database query %i fails', async (failedQuery) => {
    const { controller, db, req, res } = setup(Controller);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    if (failedQuery === 2) db.execute.mockResolvedValueOnce([[{ id: 1 }]]);
    db.execute.mockRejectedValueOnce(databaseFailure());
    await controller.findMatches(req, res);
    expect(db.execute).toHaveBeenCalledTimes(failedQuery);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Could not load matches. Please try again.' });
  });
});
