import * as vscode from 'vscode';
import { readKojiConfig, KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY } from '../config';
import { requestText } from '../net/requestText';
import { loadTlsOptions } from '../koji/tls';

export interface KojiLogRequest {
  url: string;
  title: string;
}

export const KOJI_LOG_SCHEME = 'koji-log';

export function createKojiLogUri(req: KojiLogRequest): vscode.Uri {
  // Use query to preserve full URL (including https://)
  const encoded = encodeURIComponent(req.url);
  return vscode.Uri.parse(`${KOJI_LOG_SCHEME}:${encodeURIComponent(req.title)}?url=${encoded}`);
}

export function parseKojiLogUri(uri: vscode.Uri): KojiLogRequest {
  const title = decodeURIComponent(uri.path.replace(/^\//, ''));
  const params = new URLSearchParams(uri.query);
  const url = params.get('url');
  if (!url) throw new Error('Missing url query param');
  return { title, url: decodeURIComponent(url) };
}

export class KojiLogContentProvider implements vscode.TextDocumentContentProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { url, title } = parseKojiLogUri(uri);
    try {
      const cfg = readKojiConfig();
      const passphrase = await this.secrets.get(KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY);
      const tls = await loadTlsOptions({
        caFile: cfg.ssl.caFile,
        certFile: cfg.ssl.certFile,
        keyFile: cfg.ssl.keyFile,
        keyPassphrase: passphrase ?? undefined,
        rejectUnauthorized: cfg.ssl.rejectUnauthorized,
      });

      const resp = await requestText(url, { method: 'GET', tls });
      if (resp.status < 200 || resp.status >= 300) {
        return `Failed to fetch ${title}\nHTTP ${resp.status} ${resp.statusText}\nURL: ${url}\n\n${resp.bodyText}\n`;
      }
      return resp.bodyText;
    } catch (e: any) {
      return `Failed to fetch ${title}\n${String(e?.message ?? e)}\nURL: ${url}\n`;
    }
  }
}


