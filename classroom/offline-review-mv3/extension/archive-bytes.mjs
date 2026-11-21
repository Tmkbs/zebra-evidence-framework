const encoder = new TextEncoder();
export const utf8Bytes = value => encoder.encode(value);
export const sha256 = async value => {
  const bytes = typeof value === 'string' ? utf8Bytes(value) : value;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
export function boundedCopy(bytes, limit, fail) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > limit) return fail();
  return Uint8Array.from(bytes);
}
