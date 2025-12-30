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
    const subject = taskSubject(task);
    const titleParts = [`#${task.id}`, task.method];
    if (subject) titleParts.push(subject);
    super(titleParts.join(' · '), vscode.TreeItemCollapsibleState.None);

    const created = task.create_time ? `created: ${task.create_time}` : '';
    const state = formatTaskState(task.state);
    const owner = task.owner_name ? `owner: ${task.owner_name}` : '';
    this.description = [state, owner, created].filter(Boolean).join(' · ');

    const lines: string[] = [];
    lines.push(`Task ID: ${task.id}`);
    lines.push(`Method: ${task.method}`);
    if (subject) lines.push(`Subject: ${subject}`);
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

function taskSubject(task: KojiTask): string | undefined {
  const label = typeof task.label === 'string' ? task.label.trim() : '';
  if (label && !looksLikeXml(label)) return shorten(label);

  const req: any = task.request as any;
  if (Array.isArray(req) && typeof req[0] === 'string') {
    const s = req[0].trim();
    if (s && !looksLikeXml(s)) {
      // Often build tasks include SCM URL as first request item. Derive package name if possible.
      const pkg = packageFromScmUrl(s);
      return shorten(pkg ?? s);
    }
  }
  if (typeof req === 'string') {
    const s = req.trim();
    if (s && !looksLikeXml(s)) return shorten(s);
  }
  return undefined;
}

function shorten(s: string, max = 70): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function looksLikeXml(s: string): boolean {
  const t = s.trimStart();
  return t.startsWith('<?xml') || (t.includes('<') && t.includes('>'));
}

function packageFromScmUrl(s: string): string | undefined {
  // Best-effort extraction of "package name" from SCM URL.
  // Examples:
  // - git+https://.../rpms/bash?#<rev>  -> bash
  // - https://.../cgit/rpms/bash.git    -> bash
  // - git://.../bash                   -> bash
  try {
    if (!s.includes('://')) return undefined;
    // Strip scheme prefixes like "git+https://"
    const cleaned = s.replace(/^git\+/, '');
    const u = new URL(cleaned);
    const path = u.pathname.replace(/\/+$/, '');
    const last = path.split('/').filter(Boolean).pop();
    if (!last) return undefined;
    return last.endsWith('.git') ? last.slice(0, -4) : last;
  } catch {
    return undefined;
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


