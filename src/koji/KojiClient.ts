import { decodeMethodResponse, encodeMethodCall, type XmlRpcValue } from './xmlrpc';
import { requestText } from '../net/requestText';
import type { LoadedTlsOptions } from './tls';

export interface KojiBuild {
  build_id: number;
  name: string;
  version: string;
  release: string;
  epoch?: string | null;
  state?: number;
  completion_time?: string | null;
  creation_time?: string | null;
  owner_name?: string | null;
  task_id?: number | null;
}

export interface KojiTask {
  id: number;
  method: string;
  state: number;
  label?: string | null;
  owner_name?: string | null;
  create_time?: string | null;
  start_time?: string | null;
  completion_time?: string | null;
  request: string;
}

export interface KojiClientOptions {
  hubUrl: string;
  userAgent?: string;
  cookie?: string;
  tls?: LoadedTlsOptions;
}

export class KojiClient {
  private cookie?: string;
  private readonly hubUrl: string;
  private readonly userAgent: string;
  private readonly tls?: LoadedTlsOptions;

  constructor(opts: KojiClientOptions) {
    this.hubUrl = opts.hubUrl;
    this.userAgent = opts.userAgent ?? 'koji-vscode';
    this.cookie = opts.cookie;
    this.tls = opts.tls;
  }

  getCookie(): string | undefined {
    return this.cookie;
  }

  private updateCookieFromHeaders(headers: Record<string, string | string[] | undefined>): void {
    // Koji uses "koji_session=..." cookie. Keep only "name=value" part.
    const setCookie = headers['set-cookie'];
    const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!first) return;
    const cookiePart = first.split(';')[0]?.trim();
    if (cookiePart) this.cookie = cookiePart;
  }

  async call<T = unknown>(methodName: string, params: XmlRpcValue[] = []): Promise<T> {
    const body = encodeMethodCall(methodName, params);

    const headers: Record<string, string> = {
      'content-type': 'text/xml',
      'user-agent': this.userAgent,
    };
    if (this.cookie) headers.cookie = this.cookie;

    const resp = await requestText(this.hubUrl, { method: 'POST', headers, body, tls: this.tls });
    this.updateCookieFromHeaders(resp.headers as any);

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`Koji HTTP ${resp.status} ${resp.statusText}${resp.bodyText ? `: ${resp.bodyText}` : ''}`);
    }

    const xml = resp.bodyText;
    return decodeMethodResponse(xml) as unknown as T;
  }

  async login(username: string, password: string): Promise<void> {
    await this.call('login', [username, password]);
  }

  async sslLogin(): Promise<void> {
    // For setups that use client cert auth, Koji exposes sslLogin().
    await this.call('sslLogin', []);
  }

  async listBuildsLatest(limit: number): Promise<KojiBuild[]> {

    const query: Record<string, XmlRpcValue> = {
          order: '-build_id',
          limit: limit,
    };

    const builds = await this.call<unknown>('listBuilds', [null, null, null, null, null, null, null, null, null, null, null, null, null, query]);
    if (!Array.isArray(builds)) return [];
    return builds as KojiBuild[];
  }

  async listTasksLatest(opts: {
    limit: number;
    owner?: string;
    state?: number;
  }): Promise<KojiTask[]> {
    const query: Record<string, XmlRpcValue> = {
      order: '-id',
      limit: opts.limit,
    };
    if (opts.owner) query.owner = opts.owner;
    if (typeof opts.state === 'number') query.state = opts.state;

    const tasks = await this.call<unknown>('listTasks', [null, query]);
    if (!Array.isArray(tasks)) return [];
    return tasks as KojiTask[];
  }

  async getTaskInfo(taskId: number): Promise<KojiTask | null> {
    const info = await this.call<unknown>('getTaskInfo', [taskId, true]);
    if (!info || typeof info !== 'object') return null;
    return info as KojiTask;
  }
}


