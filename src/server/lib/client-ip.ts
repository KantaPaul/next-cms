/**
 * The visitor's IP for rate limiting.
 *
 * `X-Forwarded-For` is a list the client can start with any values it likes;
 * each proxy appends the address it saw. Only the entries added by our own
 * proxies can be trusted, so we count `trustedHops` back from the end
 * (default 1: one reverse proxy such as nginx or a platform edge). Taking the
 * first entry, as before, let a client dodge limits by sending a new fake IP
 * on every request.
 */
export function clientIp(headers: Headers, trustedHops = 1): string {
  const forwarded = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (forwarded.length > 0) {
    const index = Math.max(0, forwarded.length - Math.max(1, trustedHops));
    return forwarded[index];
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
