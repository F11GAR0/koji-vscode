import type { KojiTask } from '../koji/KojiClient';
import type { KojiTaskStateFilter } from '../config';

export function mapTaskStateFilterToCode(filter: KojiTaskStateFilter): number | undefined {
  switch (filter) {
    case 'ALL':
      return undefined;
    case 'FREE':
      return 0;
    case 'OPEN':
      return 1;
    case 'CLOSED':
      return 2;
    case 'CANCELED':
      return 3;
    case 'ASSIGNED':
      return 4;
    case 'FAILED':
      return 5;
    default:
      return undefined;
  }
}

export function parseKojiTime(v: string | null | undefined): number {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

export function sortTasksByCreateTimeDesc(tasks: KojiTask[]): KojiTask[] {
  return [...tasks].sort((a, b) => {
    const at = parseKojiTime(a.create_time);
    const bt = parseKojiTime(b.create_time);
    if (at !== bt) return bt - at;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}


