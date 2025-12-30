import * as http from 'node:http';
import * as https from 'node:https';

export interface RequestTextOptions {
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string | Buffer;
  tls?: {
    ca?: Buffer;
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    rejectUnauthorized: boolean;
  };
}

export interface ResponseText {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  bodyText: string;
}

export async function requestText(url: string, opts: RequestTextOptions): Promise<ResponseText> {
  const u = new URL(url);
  const isHttps = u.protocol === 'https:';
  const mod = isHttps ? https : http;

  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const body = opts.body ?? undefined;
  if (body !== undefined && headers['content-length'] === undefined) {
    headers['content-length'] = String(Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body));
  }

  return await new Promise<ResponseText>((resolve, reject) => {
    const req = mod.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: opts.method,
        headers,
        // TLS options apply only for https; http module will ignore extra fields.
        ca: opts.tls?.ca,
        cert: opts.tls?.cert,
        key: opts.tls?.key,
        passphrase: opts.tls?.passphrase,
        rejectUnauthorized: opts.tls?.rejectUnauthorized,
      } as any,
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            headers: res.headers,
            bodyText: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}


