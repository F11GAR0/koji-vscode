import { decodeMethodResponse, encodeMethodCall, type XmlRpcValue } from './xmlrpc';

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
  owner_name?: string | null;
  create_time?: string | null;
  start_time?: string | null;
  completion_time?: string | null;
  request?: unknown;
}

export interface KojiClientOptions {
  hubUrl: string;
  userAgent?: string;
  cookie?: string;
}

export class KojiClient {
  private cookie?: string;
  private readonly hubUrl: string;
  private readonly userAgent: string;

  constructor(opts: KojiClientOptions) {
    this.hubUrl = opts.hubUrl;
    this.userAgent = opts.userAgent ?? 'koji-vscode';
    this.cookie = opts.cookie;
  }

  getCookie(): string | undefined {
    return this.cookie;
  }

  private updateCookieFromHeaders(headers: Headers): void {
    // Koji uses "koji_session=..." cookie. We keep the whole cookie header value (without attributes).
    const setCookie = headers.get('set-cookie');
    if (!setCookie) return;
    const first = setCookie.split(',')[0]; // good enough for single cookie
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

    const resp = await fetch(this.hubUrl, {
      method: 'POST',
      headers,
      body,
    });

    this.updateCookieFromHeaders(resp.headers);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Koji HTTP ${resp.status} ${resp.statusText}${text ? `: ${text}` : ''}`);
    }

    const xml = await resp.text();
    return decodeMethodResponse(xml) as unknown as T;
  }

  async login(username: string, password: string): Promise<void> {
    await this.call('login', [username, password]);
  }

  async listBuildsLatest(limit: number): Promise<KojiBuild[]> {
    // Koji supports queryOpts with ordering and limit.
    // listBuilds(opts?: dict, queryOpts?: dict)
    const queryOpts = { order: '-completion_time', limit };
    const builds = await this.call<unknown>('listBuilds', [{}, queryOpts]);
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

    const tasks = await this.call<unknown>('listTasks', [query]);
    if (!Array.isArray(tasks)) return [];
    return tasks as KojiTask[];
  }

  async getTaskInfo(taskId: number): Promise<KojiTask | null> {
    const info = await this.call<unknown>('getTaskInfo', [taskId, true]);
    if (!info || typeof info !== 'object') return null;
    return info as KojiTask;
  }
}


