import * as vscode from 'vscode';
import type { KojiBuild, KojiTask } from '../koji/KojiClient';

export class KojiBuildItem extends vscode.TreeItem {
  constructor(public readonly build: KojiBuild, webUrl: string) {
    const nvr = `${build.name}-${build.version}-${build.release}`;
    super(nvr, vscode.TreeItemCollapsibleState.None);
    this.description = build.completion_time ?? build.creation_time ?? '';
    this.tooltip = `Build ID: ${build.build_id}\nOwner: ${build.owner_name ?? ''}\nTask: ${build.task_id ?? ''}`;
    this.contextValue = 'kojiBuild';
    this.command = {
      command: 'koji.openBuildInBrowser',
      title: 'Open build in browser',
      arguments: [build.build_id, webUrl],
    };
  }
}

export class KojiTaskItem extends vscode.TreeItem {
  constructor(public readonly task: KojiTask) {
    super(`#${task.id} ${task.method}`, vscode.TreeItemCollapsibleState.None);
    this.description = formatTaskState(task.state);
    this.tooltip = `Task ID: ${task.id}\nOwner: ${task.owner_name ?? ''}\nState: ${formatTaskState(task.state)}`;
    this.contextValue = 'kojiTask';
    this.command = {
      command: 'koji.openTaskLog',
      title: 'Open task log',
      arguments: [task.id],
    };
  }
}

export function formatTaskState(state: number): string {
  switch (state) {
    case 0:
      return 'FREE';
    case 1:
      return 'OPEN';
    case 2:
      return 'CLOSED';
    case 3:
      return 'CANCELED';
    case 4:
      return 'ASSIGNED';
    case 5:
      return 'FAILED';
    default:
      return `STATE_${state}`;
  }
}


