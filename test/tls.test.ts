import * as assert from 'assert';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadTlsOptions } from '../src/koji/tls';

describe('koji/tls', () => {
  it('returns undefined when no TLS config provided and rejectUnauthorized=true', async () => {
    const out = await loadTlsOptions({ rejectUnauthorized: true });
    assert.strictEqual(out, undefined);
  });

  it('loads PEM files and passphrase', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'koji-vscode-tls-'));
    const caFile = path.join(dir, 'ca.pem');
    const certFile = path.join(dir, 'cert.pem');
    const keyFile = path.join(dir, 'key.pem');

    await fs.writeFile(caFile, 'CA');
    await fs.writeFile(certFile, 'CERT');
    await fs.writeFile(keyFile, 'KEY');

    const out = await loadTlsOptions({
      caFile,
      certFile,
      keyFile,
      keyPassphrase: 'secret',
      rejectUnauthorized: false,
    });

    assert.ok(out);
    assert.strictEqual(out.rejectUnauthorized, false);
    assert.strictEqual(out.ca?.toString('utf8'), 'CA');
    assert.strictEqual(out.cert?.toString('utf8'), 'CERT');
    assert.strictEqual(out.key?.toString('utf8'), 'KEY');
    assert.strictEqual(out.passphrase, 'secret');
  });
});


