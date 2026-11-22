const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function loadRequestUi() {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="incoming-requests"></div>
    <div id="requests-status"></div>
    <button id="load-more-requests"></button>
  </body>`);
  const context = {
    document: dom.window.document,
    window: { location: { replace: jest.fn() } },
    fetch: jest.fn(),
    console,
    TypeError: dom.window.TypeError
  };
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/requests.js'), 'utf8')
    .replace(/\nloadRequests\(\);\s*$/, '\n');
  vm.runInNewContext(`${source}\nthis.testMethods = {
    showRequestError, showRequestStatus, getRequestErrorMessage,
    showRequestsEmptyState, showRequestsRetryButton, updateRequestStatus,
    loadRequests
  };`, context);
  return { context, document: dom.window.document, ...context.testMethods };
}

test('showRequestError displays an alert message', () => {
  const { document, showRequestError } = loadRequestUi();
  const status = document.getElementById('requests-status');

  showRequestError('Could not load requests.');

  expect(status.textContent).toBe('Could not load requests.');
  expect(status.getAttribute('role')).toBe('alert');
  expect(status.style.color).toBe('rgb(153, 27, 27)');
});

test('showRequestStatus displays a non-error status', () => {
  const { document, showRequestStatus } = loadRequestUi();
  const status = document.getElementById('requests-status');

  showRequestStatus('Loading requests...');

  expect(status.textContent).toBe('Loading requests...');
  expect(status.getAttribute('role')).toBe('status');
  expect(status.style.color).toBe('');
});

test('getRequestErrorMessage distinguishes connection and general errors', () => {
  const { context, getRequestErrorMessage } = loadRequestUi();

  expect(getRequestErrorMessage(new context.TypeError(), 'load requests'))
    .toBe('Unable to connect to SkillSwap. Please check your connection and try again.');
  expect(getRequestErrorMessage(new Error('server details'), 'load requests'))
    .toBe('Could not load requests. Please try again later.');
});

test('showRequestsEmptyState renders the empty-request message', () => {
  const { document, showRequestsEmptyState } = loadRequestUi();
  const container = document.getElementById('incoming-requests');

  showRequestsEmptyState();

  expect(container.querySelector('h3').textContent).toBe('No swap requests yet!');
  expect(container.querySelector('p').textContent).toContain('their request will appear here');
});

test('showRequestsRetryButton disables the button and retries the same page once', () => {
  const { context, document, showRequestsRetryButton } = loadRequestUi();
  context.loadRequests = jest.fn();
  const status = document.getElementById('requests-status');

  showRequestsRetryButton('Could not load requests.', 50);
  const button = status.querySelector('button');
  button.click();

  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe('Retrying...');
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(context.loadRequests).toHaveBeenCalledTimes(1);
  expect(context.loadRequests).toHaveBeenCalledWith(50);
});

test('updateRequestStatus applies the status class and label', () => {
  const { document, updateRequestStatus } = loadRequestUi();
  const status = document.createElement('p');

  updateRequestStatus(status, 'accepted');

  expect(status.className).toBe('request-status status-accepted');
  expect(status.textContent).toBe('Status: accepted');
});

test('loadRequests renders incoming pending requests with response buttons', async () => {
  const { context, document } = loadRequestUi();
  context.fetch.mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ requests: [{ id: 42, senderName: 'Sam', status: 'pending' }] })
  });

  await context.loadRequests();

  const card = document.querySelector('.request-card');
  expect(card.querySelector('h3').textContent).toBe('Sam');
  expect(card.querySelector('.request-status').textContent).toBe('Status: pending');
  expect(Array.from(card.querySelectorAll('button')).map(button => button.textContent))
    .toEqual(['Accept Request', 'Reject Request']);
  expect(context.fetch).toHaveBeenCalledWith(
    'http://localhost:3000/api/requests?direction=incoming&offset=0',
    { credentials: 'include', cache: 'no-store' }
  );
});
