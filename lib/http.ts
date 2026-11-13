const cache = new Map<string, { expires: number; value: unknown }>();
export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + ttl, value });
  return value;
}
export async function boundedFetch(
  url: string,
  allowedHosts: string[],
  maxBytes = 2_000_000,
  timeout = 10000,
): Promise<{ bytes: Uint8Array; type: string; url: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let current = url;
      for (let hop = 0; hop < 3; hop++) {
        const u = new URL(current);
        if (
          u.protocol !== "https:" ||
          u.username ||
          u.password ||
          u.port ||
          !allowedHosts.includes(u.hostname)
        )
          throw new Error("Source host is not permitted");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const r = await fetch(u, {
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; FINN research prototype)",
              Accept:
                "application/json,application/pdf,text/html,application/xml,text/csv,*/*",
            },
          });
          if ([301, 302, 303, 307, 308].includes(r.status)) {
            const location = r.headers.get("location");
            if (!location) throw new Error("Redirect without destination");
            current = new URL(location, u).href;
            continue;
          }
          if (!r.ok) throw new Error(`Source returned HTTP ${r.status}`);
          if (Number(r.headers.get("content-length")) > maxBytes)
            throw new Error("Source exceeds size limit");
          const reader = r.body?.getReader();
          if (!reader) throw new Error("Empty source");
          let size = 0;
          const parts: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > maxBytes) {
              await reader.cancel();
              throw new Error("Source exceeds size limit");
            }
            parts.push(value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const part of parts) {
            bytes.set(part, offset);
            offset += part.length;
          }
          return {
            bytes,
            type: r.headers.get("content-type") || "",
            url: current,
          };
        } finally {
          clearTimeout(timer);
        }
      }
      throw new Error("Too many source redirects");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Source unavailable";
      if (attempt === 1 || /HTTP 4|limit|permitted|redirect/i.test(m))
        throw new Error(m);
    }
  }
  throw new Error("Source unavailable");
}
export async function textFetch(
  url: string,
  hosts: string[],
  maxBytes = 2_000_000,
) {
  return new TextDecoder().decode(
    (await boundedFetch(url, hosts, maxBytes)).bytes,
  );
}
export function apiError(e: unknown, status = 400) {
  return Response.json(
    { error: e instanceof Error ? e.message : "Request failed" },
    { status },
  );
}
export function safeLink(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
