/**
 * Decodes a JWT payload for client-side display purposes only (e.g. "which
 * role am I so I can route to the right dashboard"). This performs NO
 * signature verification — that's meaningless client-side anyway, since the
 * server verifies every request independently. Never trust this decoded
 * value for anything security-relevant; it's purely UI convenience.
 */
export function jwtDecode<T>(token: string): T {
  const payload = token.split('.')[1];
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return JSON.parse(json) as T;
}
