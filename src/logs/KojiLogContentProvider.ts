import * as vscode from 'vscode';

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

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { url, title } = parseKojiLogUri(uri);
    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        return `Failed to fetch ${title}\nHTTP ${resp.status} ${resp.statusText}\nURL: ${url}\n`;
      }
      return await resp.text();
    } catch (e: any) {
      return `Failed to fetch ${title}\n${String(e?.message ?? e)}\nURL: ${url}\n`;
    }
  }
}


