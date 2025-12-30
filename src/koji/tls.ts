import { promises as fs } from 'node:fs';

export interface TlsFileConfig {
  caFile?: string;
  certFile?: string;
  keyFile?: string;
  keyPassphrase?: string;
  rejectUnauthorized: boolean;
}

export interface LoadedTlsOptions {
  ca?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  rejectUnauthorized: boolean;
}

function normalizePath(p?: string): string | undefined {
  const s = (p ?? '').trim();
  return s.length ? s : undefined;
}

export async function loadTlsOptions(cfg: TlsFileConfig): Promise<LoadedTlsOptions | undefined> {
  const caFile = normalizePath(cfg.caFile);
  const certFile = normalizePath(cfg.certFile);
  const keyFile = normalizePath(cfg.keyFile);
  const passphrase = (cfg.keyPassphrase ?? '').trim() || undefined;

  const needs =
    !cfg.rejectUnauthorized || caFile !== undefined || certFile !== undefined || keyFile !== undefined || passphrase;
  if (!needs) return undefined;

  const out: LoadedTlsOptions = { rejectUnauthorized: cfg.rejectUnauthorized };

  if (caFile) out.ca = await fs.readFile(caFile);
  if (certFile) out.cert = await fs.readFile(certFile);
  if (keyFile) out.key = await fs.readFile(keyFile);
  if (passphrase) out.passphrase = passphrase;

  return out;
}


