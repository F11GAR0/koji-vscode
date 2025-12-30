import * as vscode from 'vscode';

export type KojiTaskStateFilter = 'ALL' | 'OPEN' | 'CLOSED' | 'FAILED' | 'CANCELED';

export interface KojiConfig {
  hubUrl: string;
  webUrl: string;
  filesUrl: string;
  username: string;
  buildsLimit: number;
  tasksLimit: number;
  tasksOwner: string;
  tasksState: KojiTaskStateFilter;
}

export const KOJI_PASSWORD_SECRET_KEY = 'koji.password';

export function readKojiConfig(): KojiConfig {
  const cfg = vscode.workspace.getConfiguration('koji');

  return {
    hubUrl: cfg.get<string>('hubUrl', 'https://koji.fedoraproject.org/kojihub'),
    webUrl: cfg.get<string>('webUrl', 'https://koji.fedoraproject.org/koji'),
    filesUrl: cfg.get<string>('filesUrl', 'https://koji.fedoraproject.org/kojifiles'),
    username: cfg.get<string>('username', ''),
    buildsLimit: cfg.get<number>('builds.limit', 20),
    tasksLimit: cfg.get<number>('tasks.limit', 50),
    tasksOwner: cfg.get<string>('tasks.owner', ''),
    tasksState: cfg.get<KojiTaskStateFilter>('tasks.state', 'ALL'),
  };
}


