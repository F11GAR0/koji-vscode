import * as vscode from 'vscode';

export type KojiTaskStateFilter = 'ALL' | 'FREE' | 'OPEN' | 'ASSIGNED' | 'CLOSED' | 'FAILED' | 'CANCELED';

export interface KojiConfig {
  hubUrl: string;
  webUrl: string;
  filesUrl: string;
  username: string;
  buildsLimit: number;
  tasksLimit: number;
  tasksOwner: string;
  tasksState: KojiTaskStateFilter;
  ssl: {
    caFile: string;
    certFile: string;
    keyFile: string;
    rejectUnauthorized: boolean;
  };
}

export const KOJI_PASSWORD_SECRET_KEY = 'koji.password';
export const KOJI_SSL_KEY_PASSPHRASE_SECRET_KEY = 'koji.ssl.keyPassphrase';

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
    ssl: {
      caFile: cfg.get<string>('ssl.caFile', ''),
      certFile: cfg.get<string>('ssl.certFile', ''),
      keyFile: cfg.get<string>('ssl.keyFile', ''),
      rejectUnauthorized: cfg.get<boolean>('ssl.rejectUnauthorized', true),
    },
  };
}


