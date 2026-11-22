const Controller = require('../../controllers/LearningSkillsController');
const { setup, databaseFailure } = require('./helpers');

afterEach(() => jest.restoreAllMocks());

describe('LearningSkillsController.addSkill', () => {

  test.each([undefined, null, {}, { name: 123 }, { name: [] }])(
    'rejects missing or non-string input: %p', async (body) => {
      const { controller, db, req, res } = setup(Controller);
      req.body = body;
      await controller.addSkill(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ message: 'Enter a skill name.' });
      expect(db.execute).not.toHaveBeenCalled();
    }
  );

  test.each(['', '   ', '\t\n', 'x'.repeat(101)])(
    'rejects invalid name partition %#', async (name) => {
      const { controller, db, req, res } = setup(Controller);
      req.body = { name };
      await controller.addSkill(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Skill name must contain 1.*100 characters/);
      expect(db.execute).not.toHaveBeenCalled();
    }
  );

  test.each(['x', 'x'.repeat(100)])('accepts valid length boundary %#', async (name) => {
    const { controller, db, req, res } = setup(Controller);
    req.body = { name };
    db.execute.mockResolvedValueOnce([{ insertId: 31 }]);
    await controller.addSkill(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.skill).toEqual({ id: 31, name });
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO learning_skills (user_id, name) VALUES (?, ?)', [7, name]
    );
  });

  test('normalizes spaces and ignores a forged user ID in the body', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.body = { name: '  Web  \t Design  ', userId: 999 };
    db.execute.mockResolvedValueOnce([{ insertId: 32 }]);
    await controller.addSkill(req, res);
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO learning_skills (user_id, name) VALUES (?, ?)', [7, 'Web Design']
    );
    expect(res.body.skill).toEqual({ id: 32, name: 'Web Design' });
  });

  test('passes SQL-like input as a value, not executable SQL', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.body = { name: "SQL'); DROP learning_skills users; --" };
    db.execute.mockResolvedValueOnce([{ insertId: 33 }]);
    await controller.addSkill(req, res);
    expect(db.execute.mock.calls[0][0]).toBe('INSERT INTO learning_skills (user_id, name) VALUES (?, ?)');
    expect(db.execute.mock.calls[0][1]).toEqual([7, req.body.name]);
    expect(res.statusCode).toBe(201);
  });

  test('returns 409 for a duplicate skill', async () => {
    const { controller, db, req, res } = setup(Controller);
    req.body = { name: 'SQL' };
    db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    await controller.addSkill(req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ message: 'This skill is already in your learning list.' });
  });

  test('returns a generic 500 response for another database error', async () => {
    const { controller, db, req, res } = setup(Controller);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    req.body = { name: 'SQL' };
    db.execute.mockRejectedValueOnce(databaseFailure());
    await controller.addSkill(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Could not save the skill. Please try again.' });
  });
});
