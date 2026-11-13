import 'server-only';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

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

export interface ResolvedSafeUrl {
  url: URL;
  addresses: Array<{ address: string; family: number }>;
}

/**
 * Validates that a target URL is safe from SSRF attacks and returns the
 * parsed URL along with its DNS-verified IP addresses for connection pinning.
 */
export async function resolveSafeUrl(
  urlStr: string,
  options?: { lookup?: DnsLookupFn; nodeEnv?: string }
): Promise<ResolvedSafeUrl> {
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
    const family = rawHost === '::1' ? 6 : 4;
    return {
      url,
      addresses: [{ address: family === 6 ? '::1' : '127.0.0.1', family }],
    };
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed.');
  }

  const lookupFn = options?.lookup ?? defaultDnsLookup;

  const ipFamily = net.isIP(rawHost);
  if (ipFamily) {
    if (isPrivateOrReservedIp(rawHost)) {
      throw new Error(`SSRF guard: prohibited IP address ${rawHost}`);
    }
    return { url, addresses: [{ address: rawHost, family: ipFamily }] };
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

  return { url, addresses: records };
}

/**
 * Validates that a target URL is safe from SSRF attacks.
 * Rejects non-HTTPS (unless NODE_ENV=development and localhost),
 * and rejects private, loopback, link-local and multicast IPs.
 */
export async function assertSafeUrl(
  urlStr: string,
  options?: { lookup?: DnsLookupFn; nodeEnv?: string }
): Promise<URL> {
  const { url } = await resolveSafeUrl(urlStr, options);
  return url;
}

/**
 * Creates a `dns.lookup`-compatible function pinned to pre-validated IP
 * addresses so `http`/`https` never re-resolves DNS (prevents DNS rebinding).
 */
export function createPinnedLookup(
  addresses: Array<{ address: string; family: number }>
): http.RequestOptions['lookup'] {
  return ((
    _hostname: string,
    optsOrCb:
      | { family?: number; all?: boolean }
      | ((err: NodeJS.ErrnoException | null, address: unknown, family?: number) => void),
    maybeCb?: (
      err: NodeJS.ErrnoException | null,
      address: unknown,
      family?: number
    ) => void
  ) => {
    const cb = typeof optsOrCb === 'function' ? optsOrCb : maybeCb;
    const opts = typeof optsOrCb === 'function' ? {} : optsOrCb ?? {};
    if (!cb) return;
    if (addresses.length === 0) {
      cb(new Error('No pinned IP addresses available.'), undefined);
      return;
    }
    if (opts.all) {
      cb(null, addresses);
      return;
    }
    const preferred =
      opts.family === 4 || opts.family === 6
        ? addresses.find(a => a.family === opts.family) ?? addresses[0]
        : addresses[0];
    cb(null, preferred.address, preferred.family);
  }) as http.RequestOptions['lookup'];
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Decodes a gzip, deflate or brotli response body. Unknown or missing
 * encodings pass through. Size caps (fetchJsonCapped) then count decoded
 * bytes, so a small compressed "zip bomb" cannot slip past them.
 */
export function decodeResponseBody(
  body: Readable,
  contentEncoding: string | string[] | undefined
): Readable {
  const encoding = (Array.isArray(contentEncoding) ? contentEncoding.join(',') : contentEncoding ?? '')
    .trim()
    .toLowerCase();
  let decoder: zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress | null = null;
  if (encoding === 'gzip' || encoding === 'x-gzip') decoder = zlib.createGunzip();
  else if (encoding === 'deflate') decoder = zlib.createInflate();
  else if (encoding === 'br') decoder = zlib.createBrotliDecompress();
  if (!decoder) return body;
  body.on('error', err => decoder.destroy(err));
  return body.pipe(decoder);
}

async function pinnedNodeFetch(
  url: URL,
  addresses: Array<{ address: string; family: number }>,
  init?: RequestInit
): Promise<Response> {
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;
  const method = (init?.method ?? 'GET').toUpperCase();
  const headersObj = new Headers(init?.headers);
  const reqHeaders: Record<string, string> = {};
  headersObj.forEach((value, key) => {
    reqHeaders[key] = value;
  });
  // Node's http client, unlike fetch, does not decode compressed bodies:
  // always ask for encodings decodeResponseBody handles, replacing any
  // Accept-Encoding a preset set (e.g. `zstd`) that we could not read.
  reqHeaders['accept-encoding'] = 'gzip, deflate, br';

  let bodyBuffer: Buffer | undefined;
  if (init?.body !== undefined && init.body !== null) {
    if (typeof init.body === 'string') {
      bodyBuffer = Buffer.from(init.body, 'utf8');
    } else if (init.body instanceof Uint8Array) {
      bodyBuffer = Buffer.from(init.body);
    } else if (init.body instanceof ArrayBuffer) {
      bodyBuffer = Buffer.from(init.body);
    } else {
      bodyBuffer = Buffer.from(String(init.body), 'utf8');
    }
    if (!headersObj.has('content-length')) {
      reqHeaders['content-length'] = String(bodyBuffer.byteLength);
    }
  }

  const rawHost = url.hostname.replace(/^\[|\]$/g, '');
  const lookup = createPinnedLookup(addresses);

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method,
        headers: reqHeaders,
        lookup,
        signal: init?.signal ?? undefined,
        ...(isHttps && !net.isIP(rawHost) ? { servername: rawHost } : {}),
      },
      res => {
        const status = res.statusCode ?? 500;
        const resHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (v === undefined) continue;
          if (Array.isArray(v)) {
            for (const item of v) resHeaders.append(k, item);
          } else {
            resHeaders.set(k, v);
          }
        }
        const noBody = method === 'HEAD' || NULL_BODY_STATUSES.has(status);
        let bodyStream: ReadableStream<Uint8Array> | null = null;
        if (!noBody) {
          const decoded = decodeResponseBody(res, res.headers['content-encoding']);
          if (decoded !== res) {
            // The body is now decoded: these described the compressed bytes.
            resHeaders.delete('content-encoding');
            resHeaders.delete('content-length');
          }
          bodyStream = Readable.toWeb(decoded) as ReadableStream<Uint8Array>;
        }
        resolve(
          new Response(bodyStream, {
            status,
            statusText: res.statusMessage ?? '',
            headers: resHeaders,
          })
        );
      }
    );

    req.on('error', err => reject(err));
    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

const MAX_REDIRECTS = 3;

/**
 * Performs a fetch after verifying that the URL does not resolve to
 * a prohibited SSRF target address. Redirects are followed by hand so every
 * hop passes the same check: a public URL can't bounce the request to
 * 169.254.169.254 or the internal network.
 *
 * When using the default `fetch`, the underlying socket connects via a pinned
 * DNS lookup to the already-validated IP addresses, preventing DNS rebinding.
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
    const { url: safeUrl, addresses } = await resolveSafeUrl(target, options);
    const response =
      fetchFn === fetch
        ? await pinnedNodeFetch(safeUrl, addresses, {
            ...request,
            redirect: 'manual',
          })
        : await fetchFn(safeUrl, { ...request, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }
    if (hop >= MAX_REDIRECTS) {
      throw new Error('SSRF guard: too many redirects.');
    }
    const nextUrl = new URL(location, safeUrl);
    target = nextUrl.toString();
    // A redirect to another origin must not carry the caller's credentials:
    // drop every header that is not a known-harmless content header, so a
    // bearer token or `{{secret.*}}` value never reaches the redirect host.
    if (nextUrl.origin !== safeUrl.origin && request?.headers) {
      request = { ...request, headers: stripCrossOriginHeaders(request.headers) };
    }
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

/** Headers safe to forward when a redirect leaves the original origin. */
const CROSS_ORIGIN_SAFE_HEADERS = new Set([
  'accept',
  'accept-language',
  'content-language',
  'content-type',
  'user-agent',
]);

/**
 * Keeps only harmless content-negotiation headers. Custom headers are dropped
 * because any of them (`X-Api-Key`, `Token`, …) may carry a credential.
 */
export function stripCrossOriginHeaders(
  headers: HeadersInit
): Record<string, string> {
  const out: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    if (CROSS_ORIGIN_SAFE_HEADERS.has(key.toLowerCase())) {
      out[key] = value;
    }
  });
  return out;
}

export const DEFAULT_MAX_JSON_BYTES = 2 * 1024 * 1024;

/**
 * Reads and parses a JSON response body with a hard byte limit to prevent
 * unbounded memory allocation from oversized or streaming responses.
 */
export async function fetchJsonCapped(
  response: Response,
  maxBytes: number = DEFAULT_MAX_JSON_BYTES
): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      await response.body?.cancel().catch(() => {});
      throw new Error(
        `External API response exceeds maximum allowed size (${maxBytes} bytes).`
      );
    }
  }

  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new Error(
        `External API response exceeds maximum allowed size (${maxBytes} bytes).`
      );
    }
    return JSON.parse(text);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new Error(
            `External API response exceeds maximum allowed size (${maxBytes} bytes).`
          );
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = Buffer.concat(chunks, totalBytes);
  return JSON.parse(combined.toString('utf8'));
}
