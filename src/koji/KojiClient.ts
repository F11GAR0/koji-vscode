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
  request?: unknown;
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
          order: '-id',
          limit: limit,
        };

    const tryCalls: Array<() => Promise<unknown>> = [
      // Newer hubs: listBuilds(buildType, queryOpts)
      () => this.call('listBuilds', [query]),
    ];

    let lastErr: unknown;
    for (const fn of tryCalls) {
      try {
        const builds = await fn();
        if (!Array.isArray(builds)) return [];
        return builds as KojiBuild[];
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.faultString ?? e?.message ?? e);
        // Some hubs interpret the 2nd argument positionally as e.g. state/userID/etc (not queryOpts),
        // and then crash trying to bind a dict into SQL.
        if (msg.includes("can't adapt type 'dict'")) {
          break;
        }
      }
    }

    // Fallback: call without queryOpts and do client-side sort/limit.
    try {
      const builds = await this.call<unknown>('listBuilds', ['']);
      if (!Array.isArray(builds)) return [];
      const list = builds as KojiBuild[];
      const time = (b: KojiBuild): number => {
        const s = b.completion_time ?? b.creation_time ?? '';
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : 0;
      };
      return [...list].sort((a, b) => time(b) - time(a)).slice(0, limit);
    } catch (e) {
      // Surface original failure context if fallback doesn't help.
      throw lastErr ?? e;
    }
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


