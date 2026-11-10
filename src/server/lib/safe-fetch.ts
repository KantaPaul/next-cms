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
    const normalized = ip.toLowerCase();
    // Loopback ::1
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (normalized.startsWith('::ffff:')) {
      const v4Part = normalized.slice(7);
      if (net.isIPv4(v4Part)) {
        return isPrivateOrReservedIp(v4Part);
      }
    }
    // Link-local fe80::/10 (fe8x, fe9x, feax, febx)
    if (/^fe[89ab]/i.test(normalized)) return true;
    // Unique local address fc00::/7 (fc.. or fd..)
    if (/^f[cd]/i.test(normalized)) return true;
    // Multicast ff00::/8
    if (normalized.startsWith('ff')) return true;

    return false;
  }

  // Any unparsed address is rejected
  return true;
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

/**
 * Performs a fetch after verifying that the URL does not resolve to
 * a prohibited SSRF target address.
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit,
  fetchFn: typeof fetch = fetch
): Promise<Response> {
  const safeUrl = await assertSafeUrl(
    typeof url === 'string' ? url : url.toString()
  );
  return fetchFn(safeUrl, init);
}
