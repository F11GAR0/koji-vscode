import * as vscode from 'vscode';
import { readKojiConfig, KOJI_PASSWORD_SECRET_KEY, KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY } from './config';
import { COMMON_TASK_LOG_FILES, taskLogUrl } from './koji/logs';
import { KojiLogContentProvider, KOJI_LOG_SCHEME, createKojiLogUri } from './logs/KojiLogContentProvider';
import { BuildsTreeDataProvider } from './views/BuildsTreeDataProvider';
import { TasksTreeDataProvider } from './views/TasksTreeDataProvider';

async function setPassword(secrets: vscode.SecretStorage): Promise<void> {
  const password = await vscode.window.showInputBox({
    title: 'Koji password',
    prompt: 'Stored securely in VS Code Secret Storage',
    password: true,
    ignoreFocusOut: true,
  });
  if (password === undefined) return;
  await secrets.store(KOJI_PASSWORD_SECRET_KEY, password);
  vscode.window.showInformationMessage('Koji password saved.');
}

async function clearPassword(secrets: vscode.SecretStorage): Promise<void> {
  await secrets.delete(KOJI_PASSWORD_SECRET_KEY);
  vscode.window.showInformationMessage('Koji password cleared.');
}

async function setKeyPassphrase(secrets: vscode.SecretStorage): Promise<void> {
  const pass = await vscode.window.showInputBox({
    title: 'TLS private key passphrase',
    prompt: 'Stored securely in VS Code Secret Storage',
    password: true,
    ignoreFocusOut: true,
  });
  if (pass === undefined) return;
  await secrets.store(KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY, pass);
  vscode.window.showInformationMessage('TLS key passphrase saved.');
}

async function clearKeyPassphrase(secrets: vscode.SecretStorage): Promise<void> {
  await secrets.delete(KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY);
  vscode.window.showInformationMessage('TLS key passphrase cleared.');
}

async function openTaskLog(taskId?: number): Promise<void> {
  const cfg = readKojiConfig();

  let id = taskId;
  if (typeof id !== 'number') {
    const raw = await vscode.window.showInputBox({
      title: 'Task ID',
      prompt: 'Enter Koji task ID',
      validateInput: (v) => (/^\d+$/.test(v.trim()) ? undefined : 'Task ID must be a number'),
      ignoreFocusOut: true,
    });
    if (!raw) return;
    id = Number(raw.trim());
  }

  const items: Array<{ label: string; url?: string; isCustom?: boolean }> = [
    ...COMMON_TASK_LOG_FILES.map((f) => ({ label: f, url: taskLogUrl(cfg.filesUrl, id!, f) })),
    { label: 'Custom…', isCustom: true },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: `Koji task #${id} logs`,
    canPickMany: false,
  });
  if (!picked) return;

  let url = picked.url;
  let title = picked.label;
  if (picked.isCustom) {
    const file = await vscode.window.showInputBox({
      title: `Koji task #${id} log file`,
      prompt: 'Example: task.log, root.log, build.log, ...',
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim().length ? undefined : 'File name is required'),
    });
    if (!file) return;
    title = file.trim();
    url = taskLogUrl(cfg.filesUrl, id!, title);
  }

  const uri = createKojiLogUri({ title: `task-${id}-${title}`, url: url! });
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: true });
}

async function openBuildInBrowser(buildId: number, webUrlFromItem?: string): Promise<void> {
  const cfg = readKojiConfig();
  const webUrl = (webUrlFromItem || cfg.webUrl).replace(/\/+$/, '');
  const url = `${webUrl}/buildinfo?buildID=${buildId}`;
  await vscode.env.openExternal(vscode.Uri.parse(url));
}

export function activate(context: vscode.ExtensionContext): void {
  const logProvider = new KojiLogContentProvider(context.secrets);
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(KOJI_LOG_SCHEME, logProvider));

  const buildsProvider = new BuildsTreeDataProvider(context.secrets);
  const tasksProvider = new TasksTreeDataProvider(context.secrets);

  context.subscriptions.push(vscode.window.registerTreeDataProvider('kojiBuilds', buildsProvider));
  context.subscriptions.push(vscode.window.registerTreeDataProvider('kojiTasks', tasksProvider));

  context.subscriptions.push(
    vscode.commands.registerCommand('koji.refreshBuilds', () => buildsProvider.refresh()),
    vscode.commands.registerCommand('koji.refreshTasks', () => tasksProvider.refresh()),
    vscode.commands.registerCommand('koji.setPassword', () => setPassword(context.secrets)),
    vscode.commands.registerCommand('koji.clearPassword', () => clearPassword(context.secrets)),
    vscode.commands.registerCommand('koji.setKeyPassphrase', () => setKeyPassphrase(context.secrets)),
    vscode.commands.registerCommand('koji.clearKeyPassphrase', () => clearKeyPassphrase(context.secrets)),
    vscode.commands.registerCommand('koji.openTaskLog', (taskId?: number) => openTaskLog(taskId)),
    vscode.commands.registerCommand('koji.openBuildInBrowser', (buildId: number, webUrl?: string) =>
      openBuildInBrowser(buildId, webUrl)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('koji')) {
        buildsProvider.refresh();
        tasksProvider.refresh();
      }
    })
  );
}

export function deactivate(): void {
  // noop
}


