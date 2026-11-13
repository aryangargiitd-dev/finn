// Best-effort isolate-local throttling. Production shared quotas require a durable store.
const windows = new Map<string, { start: number; count: number }>();
export function rateLimit(request: Request, budget = 30) {
  const key =
    (request.headers.get("cf-connecting-ip") || "local") +
    ":" +
    new URL(request.url).pathname;
  const now = Date.now();
  let state = windows.get(key);
  if (!state || now - state.start > 60000) {
    state = { start: now, count: 0 };
    windows.set(key, state);
  }
  state.count++;
  if (windows.size > 1000) windows.delete(windows.keys().next().value!);
  return state.count > budget
    ? Response.json(
        { error: "Please wait a minute before retrying." },
        { status: 429, headers: { "Retry-After": "60" } },
      )
    : null;
}
