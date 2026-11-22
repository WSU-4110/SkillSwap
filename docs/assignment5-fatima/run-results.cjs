const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
const output = path.join(__dirname, 'results');
fs.mkdirSync(output, { recursive: true });
const files = ['teaching-list', 'teaching-add', 'learning-list', 'learning-add', 'public-profile', 'skill-matches'];
for (const file of files) {
  const args = ['node_modules/jest/bin/jest.js', '--config', 'jest.fatima.config.cjs', '--runInBand', '--verbose', '--runTestsByPath', `tests/fatima/${file}.test.js`];
  const result = spawnSync(process.execPath, args, { cwd: backend, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
  const text = `$ node ${args.join(' ')}\n\n${result.stdout || ''}${result.stderr || ''}\nExit code: ${result.status}\n`;
  fs.writeFileSync(path.join(output, file + '.txt'), text);
  if (result.status !== 0) throw new Error(file + ' failed');
  console.log(file + ': passed');
}
const coverage = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.fatima.config.cjs', '--runInBand', '--coverage'], { cwd: backend, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
fs.writeFileSync(path.join(output, 'coverage.txt'), `${coverage.stdout || ''}${coverage.stderr || ''}\nExit code: ${coverage.status}\n`);
if (coverage.status !== 0) throw new Error('Coverage run failed');
fs.copyFileSync(path.join(backend, 'coverage/fatima/coverage-summary.json'), path.join(output, 'coverage-summary.json'));
