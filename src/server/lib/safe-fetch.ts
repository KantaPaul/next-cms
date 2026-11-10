import 'server-only';
import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks whether an IPv4 or IPv6 address belongs to private, loopback,
 * link-local, multicast, or reserved ranges.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (
      parts.length !== 4 ||
      parts.some(p => Number.isNaN(p) || p < 0 || p > 255)
    ) {
      return true;
    }
    const [a, b, c] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 100.64.0.0/10 (CGNAT / Shared address)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF protocol assignments)
    if (a === 192 && b === 0 && c === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;
    // 192.88.99.0/24 (6to4 relay anycast)
    if (a === 192 && b === 88 && c === 99) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Network benchmark)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved / Broadcast)
    if (a >= 240) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    // Compare numbers, not text: `0::1`, `::ffff:7f00:1` (how the URL parser
    // writes `::ffff:127.0.0.1`) and other spellings all reach the same checks.
    const h = ipv6Hextets(ip);
    if (!h) return true;
    const isZero = (from: number, to: number) =>
      h.slice(from, to).every(x => x === 0);
    const embeddedV4 = () =>
      `${h[6] >> 8}.${h[6] & 255}.${h[7] >> 8}.${h[7] & 255}`;

    // :: and ::1
    if (isZero(0, 7) && h[7] <= 1) return true;
    // IPv4-mapped ::ffff:0:0/96 and IPv4-compatible ::/96
    if (isZero(0, 5) && (h[5] === 0xffff || h[5] === 0)) {
      return isPrivateOrReservedIp(embeddedV4());
    }
    // NAT64 64:ff9b::/96 reaches IPv4 through a gateway
    if (h[0] === 0x64 && h[1] === 0xff9b && isZero(2, 6)) {
      return isPrivateOrReservedIp(embeddedV4());
    }
    // 6to4 2002::/16 embeds an IPv4 address in hextets 1-2
    if (h[0] === 0x2002) {
      return isPrivateOrReservedIp(
        `${h[1] >> 8}.${h[1] & 255}.${h[2] >> 8}.${h[2] & 255}`
      );
    }
    // Link-local fe80::/10, unique local fc00::/7, multicast ff00::/8
    if ((h[0] & 0xffc0) === 0xfe80) return true;
    if ((h[0] & 0xfe00) === 0xfc00) return true;
    if ((h[0] & 0xff00) === 0xff00) return true;
    // Documentation 2001:db8::/32
    if (h[0] === 0x2001 && h[1] === 0x0db8) return true;

    return false;
  }

  // Any unparsed address is rejected
  return true;
}

/** An IPv6 address as eight 16-bit numbers, or null if it doesn't parse. */
function ipv6Hextets(ip: string): number[] | null {
  let text = ip.toLowerCase().split('%')[0];
  // A trailing dotted IPv4 part (::ffff:1.2.3.4) becomes two hextets.
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = v4[1].split('.').map(Number);
    if (p.some(n => n > 255)) return null;
    text = `${text.slice(0, -v4[1].length)}${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const parts = [...head, ...Array(fill).fill('0'), ...tail];
  if (parts.length !== 8 || parts.some(x => !/^[0-9a-f]{1,4}$/.test(x))) {
    return null;
  }
  return parts.map(x => Number.parseInt(x, 16));
}

export type DnsLookupFn = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

const defaultDnsLookup: DnsLookupFn = async hostname => {
  return dns.lookup(hostname, { all: true });
};

/**
 * Validates that a target URL is safe from SSRF attacks.
 * Rejects non-HTTPS (unless NODE_ENV=development and localhost),
 * and rejects private, loopback, link-local and multicast IPs.
 */
export async function assertSafeUrl(
  urlStr: string,
  options?: { lookup?: DnsLookupFn; nodeEnv?: string }
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('Invalid URL.');
  }

  const envMode = options?.nodeEnv ?? process.env.NODE_ENV;
  const isDev = envMode === 'development';
  const rawHost = url.hostname.replace(/^\[|\]$/g, '');
  const isLocalhost =
    rawHost === 'localhost' || rawHost === '127.0.0.1' || rawHost === '::1';

  if (isDev && isLocalhost) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Only HTTP/HTTPS URLs are allowed for localhost.');
    }
    return url;
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed.');
  }

  const lookupFn = options?.lookup ?? defaultDnsLookup;

  if (net.isIP(rawHost)) {
    if (isPrivateOrReservedIp(rawHost)) {
      throw new Error(`SSRF guard: prohibited IP address ${rawHost}`);
    }
    return url;
  }

  const records = await lookupFn(rawHost);
  if (!records || records.length === 0) {
    throw new Error(`SSRF guard: unable to resolve hostname ${rawHost}`);
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(`SSRF guard: prohibited IP address ${record.address}`);
    }
  }

  return url;
}

const MAX_REDIRECTS = 3;

/**
 * Performs a fetch after verifying that the URL does not resolve to
 * a prohibited SSRF target address. Redirects are followed by hand so every
 * hop passes the same check: a public URL can't bounce the request to
 * 169.254.169.254 or the internal network.
 *
 * Known limit: the address is resolved here and again by fetch, so a DNS
 * rebinding attacker with a very short TTL could still swap it in between.
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit,
  fetchFn: typeof fetch = fetch,
  options?: { lookup?: DnsLookupFn; nodeEnv?: string }
): Promise<Response> {
  let target = typeof url === 'string' ? url : url.toString();
  let request: RequestInit | undefined = init;
  for (let hop = 0; ; hop++) {
    const safeUrl = await assertSafeUrl(target, options);
    const response = await fetchFn(safeUrl, { ...request, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }
    if (hop >= MAX_REDIRECTS) {
      throw new Error('SSRF guard: too many redirects.');
    }
    target = new URL(location, safeUrl).toString();
    // 303, and 301/302 after a POST, continue as a bodiless GET, like browsers do.
    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) &&
        (request?.method ?? 'GET').toUpperCase() === 'POST')
    ) {
      request = { ...request, method: 'GET', body: undefined };
    }
  }
}
