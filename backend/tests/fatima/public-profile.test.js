const Controller = require('../../controllers/UserProfileController');
const { setup, databaseFailure } = require('./helpers');
afterEach(() => jest.restoreAllMocks());
describe('UserProfileController.getProfile', () => {
  test.each(['0', '-1', '1.5', 'abc', '', '01', '9007199254740992'])('rejects invalid ID %p', async (userId) => {
    const { controller, db, req, res } = setup(Controller);
    req.params.userId = userId;
    await controller.getProfile(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid user ID.' });
    expect(db.execute).not.toHaveBeenCalled();
  });
  test('returns 404 without reading skills when the user is missing', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.params.userId = '1';
    db.execute.mockResolvedValueOnce([[]]);
    await controller.getProfile(req, res);
    expect(res.statusCode).toBe(404);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({ message: 'User not found.' });
  });
  test('returns only public fields and both skill lists', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.params.userId = '12';
    db.execute.mockResolvedValueOnce([[{ name: 'Student', major: 'CS', bio: 'Hello', email: 'private@example.com', password_hash: 'secret' }]])
      .mockResolvedValueOnce([[{ name: 'SQL' }, { name: 'Java' }]])
      .mockResolvedValueOnce([[{ name: 'Python' }]]);
    await controller.getProfile(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ profile: { name: 'Student', major: 'CS', bio: 'Hello', teachSkills: ['SQL', 'Java'], learnSkills: ['Python'] } });
    expect(db.execute).toHaveBeenNthCalledWith(1, 'SELECT name, major, bio FROM users WHERE id = ?', ['12']);
    expect(db.execute).toHaveBeenNthCalledWith(2, 'SELECT name FROM teaching_skills WHERE user_id = ? ORDER BY id', ['12']);
    expect(db.execute).toHaveBeenNthCalledWith(3, 'SELECT name FROM learning_skills WHERE user_id = ? ORDER BY id', ['12']);
  });
  test('handles empty skills and null optional profile fields', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.params.userId = '1';
    db.execute.mockResolvedValueOnce([[{ name: 'Student', major: null, bio: null }]])
      .mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);
    await controller.getProfile(req, res);
    expect(res.body.profile).toEqual({ name: 'Student', major: null, bio: null, teachSkills: [], learnSkills: [] });
  });
  test.each([1, 2, 3])('returns 500 when database query %i fails', async (failedQuery) => {
    const { controller, db, req, res } = setup(Controller);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    req.params.userId = '12';
    if (failedQuery > 1) db.execute.mockResolvedValueOnce([[{ name: 'Student' }]]);
    if (failedQuery > 2) db.execute.mockResolvedValueOnce([[]]);
    db.execute.mockRejectedValueOnce(databaseFailure());
    await controller.getProfile(req, res);
    expect(db.execute).toHaveBeenCalledTimes(failedQuery);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Could not load the profile.' });
  });
});
