const Controller = require('../../controllers/TeachingSkillsController');
const { setup, databaseFailure } = require('./helpers');

afterEach(() => jest.restoreAllMocks());

describe('TeachingSkillsController.listSkills', () => {

  test('returns only the session user skills using a parameterized query', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.body.userId = 999;
    const skills = [{ id: 1, name: 'JavaScript' }, { id: 2, name: 'SQL' }];
    db.execute.mockResolvedValueOnce([skills]);
    await controller.listSkills(req, res);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute).toHaveBeenCalledWith(
      'SELECT id, name FROM teaching_skills WHERE user_id = ? ORDER BY id', [7]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ skills });
  });

  test('returns an empty array when the user has no skills', async () => {
    const { controller, db, req, res } = setup(Controller);
    db.execute.mockResolvedValueOnce([[]]);
    await controller.listSkills(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ skills: [] });
  });

  test('returns a generic 500 response if the database fails', async () => {
    const { controller, db, req, res } = setup(Controller);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db.execute.mockRejectedValueOnce(databaseFailure());
    await controller.listSkills(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Could not load your teaching skills. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('private database details');
  });
});
