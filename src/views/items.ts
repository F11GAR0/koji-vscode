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
    const owner = task.owner_name ? ` · ${task.owner_name}` : '';
    super(`#${task.id} ${task.method}${owner}`, vscode.TreeItemCollapsibleState.None);

    const created = task.create_time ? `created: ${task.create_time}` : '';
    const state = formatTaskState(task.state);
    this.description = [state, created].filter(Boolean).join(' · ');

    const lines: string[] = [];
    lines.push(`Task ID: ${task.id}`);
    lines.push(`Method: ${task.method}`);
    lines.push(`Owner: ${task.owner_name ?? ''}`);
    lines.push(`State: ${state}`);
    if (task.create_time) lines.push(`Create: ${task.create_time}`);
    if (task.start_time) lines.push(`Start: ${task.start_time}`);
    if (task.completion_time) lines.push(`Complete: ${task.completion_time}`);
    this.tooltip = lines.join('\n');
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


