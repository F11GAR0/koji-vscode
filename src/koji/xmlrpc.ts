import { XMLParser } from 'fast-xml-parser';

export type XmlRpcScalar = string | number | boolean | Date;
export type XmlRpcValue =
  | XmlRpcScalar
  | null
  | XmlRpcValue[]
  | { [key: string]: XmlRpcValue };

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

export function encodeXmlRpcValue(value: XmlRpcValue): string {
  if (value === null) return '<nil/>';
  if (typeof value === 'string') return `<string>${escapeXml(value)}</string>`;
  if (typeof value === 'boolean') return `<boolean>${value ? 1 : 0}</boolean>`;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('XML-RPC cannot encode non-finite number');
    if (Number.isInteger(value)) return `<int>${value}</int>`;
    return `<double>${value}</double>`;
  }
  if (value instanceof Date) return `<dateTime.iso8601>${value.toISOString()}</dateTime.iso8601>`;
  if (Array.isArray(value)) {
    const items = value.map((v) => `<value>${encodeXmlRpcValue(v)}</value>`).join('');
    return `<array><data>${items}</data></array>`;
  }
  if (isPlainObject(value)) {
    const members = Object.entries(value)
      .map(([k, v]) => `<member><name>${escapeXml(k)}</name><value>${encodeXmlRpcValue(v)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  }
  throw new Error(`Unsupported XML-RPC value: ${String(value)}`);
}

export function encodeMethodCall(methodName: string, params: XmlRpcValue[]): string {
  const paramsXml = params
    .map((p) => `<param><value>${encodeXmlRpcValue(p)}</value></param>`)
    .join('');

  return `<?xml version="1.0"?>
<methodCall>
  <methodName>${escapeXml(methodName)}</methodName>
  <params>${paramsXml}</params>
</methodCall>`;
}

type Parsed = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
});

function pickFirst<T>(v: T | T[] | undefined): T | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function decodeValueNode(node: unknown): XmlRpcValue {
  // fast-xml-parser yields objects for tags. For <value><string>...</string></value> the node is { string: "..." }.
  if (node === null || node === undefined) return null;
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);

  const obj = node as Parsed;

  if ('string' in obj) return String((obj as any).string ?? '');
  if ('int' in obj) return Number(String((obj as any).int));
  if ('i4' in obj) return Number(String((obj as any).i4));
  if ('double' in obj) return Number(String((obj as any).double));
  if ('boolean' in obj) {
    const b = String((obj as any).boolean).trim();
    return b === '1' || b.toLowerCase() === 'true';
  }
  if ('dateTime.iso8601' in obj) return new Date(String((obj as any)['dateTime.iso8601']));
  if ('nil' in obj) return null;

  if ('array' in obj) {
    const array = (obj as any).array;
    const data = array?.data;
    const values = data?.value;
    if (values === undefined) return [];
    const list = Array.isArray(values) ? values : [values];
    return list.map((v) => decodeValueNode(v));
  }

  if ('struct' in obj) {
    const struct = (obj as any).struct;
    const members = struct?.member;
    const list = members === undefined ? [] : Array.isArray(members) ? members : [members];
    const out: Record<string, XmlRpcValue> = {};
    for (const m of list) {
      const name = String(m?.name ?? '');
      out[name] = decodeValueNode(m?.value);
    }
    return out;
  }

  // Sometimes parser produces { value: { ... } } or similar shapes.
  if ('value' in obj) return decodeValueNode((obj as any).value);

  // Fallback: stringify unknown object.
  return obj as unknown as XmlRpcValue;
}

export interface XmlRpcFault extends Error {
  faultCode?: number;
  faultString?: string;
}

export function decodeMethodResponse(xml: string): XmlRpcValue {
  const root = parser.parse(xml) as Parsed;
  const resp = (root as any).methodResponse;
  if (!resp) throw new Error('Invalid XML-RPC response: no methodResponse');

  if (resp.fault) {
    const faultVal = decodeValueNode(resp.fault.value) as any;
    const err: XmlRpcFault = new Error(
      typeof faultVal?.faultString === 'string' ? faultVal.faultString : 'XML-RPC fault'
    );
    if (typeof faultVal?.faultCode === 'number') err.faultCode = faultVal.faultCode;
    if (typeof faultVal?.faultString === 'string') err.faultString = faultVal.faultString;
    throw err;
  }

  const params = resp.params?.param;
  const firstParam = pickFirst(params);
  const valueNode = firstParam?.value ?? resp.params?.value;
  return decodeValueNode(valueNode);
}


