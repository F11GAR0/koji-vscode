import * as vscode from 'vscode';
import { readKojiConfig, KOJI_PASSWORD_SECRET_KEY, KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY } from '../config';
import { KojiClient, type KojiBuild } from '../koji/KojiClient';
import { loadTlsOptions } from '../koji/tls';
import { KojiBuildItem } from './items';

export class BuildsTreeDataProvider implements vscode.TreeDataProvider<KojiBuildItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<KojiBuildItem | undefined>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private builds: KojiBuild[] = [];

  constructor(private readonly secrets: vscode.SecretStorage) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: KojiBuildItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<KojiBuildItem[]> {
    const cfg = readKojiConfig();
    const keyPassphrase = await this.secrets.get(KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY);
    const tls = await loadTlsOptions({
      caFile: cfg.ssl.caFile,
      certFile: cfg.ssl.certFile,
      keyFile: cfg.ssl.keyFile,
      keyPassphrase: keyPassphrase ?? undefined,
      rejectUnauthorized: cfg.ssl.rejectUnauthorized,
    });
    const client = new KojiClient({ hubUrl: cfg.hubUrl, tls });

    const password = await this.secrets.get(KOJI_PASSWORD_SECRET_KEY);
    if (cfg.username && password) {
      try {
        await client.login(cfg.username, password);
      } catch {
        // Non-fatal; allow anonymous calls.
      }
    }
    if (tls?.cert && tls?.key) {
      try {
        await client.sslLogin();
      } catch {
        // Non-fatal; some hubs may not require/allow sslLogin.
      }
    }

    try {
      this.builds = await client.listBuildsLatest(cfg.buildsLimit);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      vscode.window.showErrorMessage(`Koji: failed to load builds: ${msg}`);
      this.builds = [];
    }

    return this.builds.map((b) => new KojiBuildItem(b, cfg.webUrl));
  }
}


