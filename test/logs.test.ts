import * as assert from 'assert';
import { taskLogsBaseUrl, taskLogUrl } from '../src/koji/logs';

describe('koji/logs', () => {
  it('computes base task logs URL using taskId%10000 bucket', () => {
    const base = taskLogsBaseUrl('https://example.com/kojifiles/', 1234567);
    assert.strictEqual(base, 'https://example.com/kojifiles/tasks/4567/1234567');
  });

  it('computes task log URL and encodes file name', () => {
    const url = taskLogUrl('https://example.com/kojifiles', 42, 'root.log');
    assert.strictEqual(url, 'https://example.com/kojifiles/tasks/42/42/root.log');
  });

  it('strips leading slashes from fileName', () => {
    const url = taskLogUrl('https://example.com/kojifiles', 42, '/task.log');
    assert.strictEqual(url, 'https://example.com/kojifiles/tasks/42/42/task.log');
  });
});


