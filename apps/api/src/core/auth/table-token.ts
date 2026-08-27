import { createHmac } from 'node:crypto';

/**
 * Masa doğrulama token'ı — QR URL'inde imzalı {table, branch, exp} taşır.
 *
 * Misafir QR okuduğunda URL'deki `t` token'ı siparişle birlikte gelir; backend
 * imzayı + süreyi doğrular ve siparişi TOKEN'daki masaya yazar. İstemcinin
 * gönderdiği tableCode (elle değiştirilmiş olsa bile) token'la eşleşmezse 403.
 */
const TABLE_TOKEN_TTL_MS = 4 * 3600 * 1000; // 4 saat

function b64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

export function signTableToken(tableCode: string, branchSlug: string, secret: string): string {
  const payload = b64url(JSON.stringify({
    t: tableCode,
    b: branchSlug,
    exp: Date.now() + TABLE_TOKEN_TTL_MS,
  }));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyTableToken(token: string, secret: string): { table: string; branch: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  let ok = true;
  for (let i = 0; i < sig.length; i++) if (sig.charCodeAt(i) !== expected.charCodeAt(i)) { ok = false; break; }
  if (!ok) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.t !== 'string' || typeof data.b !== 'string') return null;
    return { table: data.t, branch: data.b };
  } catch {
    return null;
  }
}
