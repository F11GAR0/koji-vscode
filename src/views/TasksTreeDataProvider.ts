import * as vscode from 'vscode';
import { readKojiConfig, KOJI_PASSWORD_SECRET_KEY, type KojiTaskStateFilter } from '../config';
import { KojiClient, type KojiTask } from '../koji/KojiClient';
import { KojiTaskItem } from './items';

function mapStateFilter(filter: KojiTaskStateFilter): number | undefined {
  switch (filter) {
    case 'ALL':
      return undefined;
    case 'OPEN':
      return 1;
    case 'CLOSED':
      return 2;
    case 'FAILED':
      return 5;
    case 'CANCELED':
      return 3;
    default:
      return undefined;
  }
}

export class TasksTreeDataProvider implements vscode.TreeDataProvider<KojiTaskItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<KojiTaskItem | undefined>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private tasks: KojiTask[] = [];

  constructor(private readonly secrets: vscode.SecretStorage) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: KojiTaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<KojiTaskItem[]> {
    const cfg = readKojiConfig();
    const client = new KojiClient({ hubUrl: cfg.hubUrl });

    const password = await this.secrets.get(KOJI_PASSWORD_SECRET_KEY);
    if (cfg.username && password) {
      try {
        await client.login(cfg.username, password);
      } catch {
        // Non-fatal; allow anonymous calls.
      }
    }

    try {
      this.tasks = await client.listTasksLatest({
        limit: cfg.tasksLimit,
        owner: cfg.tasksOwner || undefined,
        state: mapStateFilter(cfg.tasksState),
      });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      vscode.window.showErrorMessage(`Koji: failed to load tasks: ${msg}`);
      this.tasks = [];
    }

    return this.tasks.map((t) => new KojiTaskItem(t));
  }
}


