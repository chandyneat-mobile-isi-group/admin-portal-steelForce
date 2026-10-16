---
name: realtime-data
description: Build live-updating features — WebSockets, Server-Sent Events, polling, pub/sub (Pusher/Ably/Supabase Realtime/Socket.IO), presence, notifications, live dashboards, chat, reconnection/backoff, and syncing realtime events with TanStack Query caches. Use this skill whenever the user wants live updates, notifications, chat, collaborative features, streaming data, "push" updates, or asks how to make data refresh automatically.
---

# Realtime Data

Choose the simplest transport that meets latency needs, treat the connection as unreliable, and keep one source of truth.

## Pick a transport
| Need | Use |
|---|---|
| Updates every 30s+ is fine | Polling (`refetchInterval`) |
| Server → client only (notifications, progress, AI streams) | **SSE** |
| Bi-directional, low latency (chat, cursors, games) | **WebSocket** |
| Serverless hosting (Vercel) + WS | Managed: Pusher, Ably, Supabase Realtime, Liveblocks, PartyKit |
| Collaborative editing | CRDT (Yjs) via Liveblocks/Hocuspocus |
Serverless functions can't hold long WS connections — use a managed service or a separate long-running server.

## SSE Route Handler
```ts
// app/api/events/route.ts
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const user = await requireUser();
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const unsub = bus.subscribe(`user:${user.id}`, msg => send("notification", msg));
      const ping = setInterval(() => controller.enqueue(enc.encode(": ping\n\n")), 25_000);
      req.signal.addEventListener("abort", () => { clearInterval(ping); unsub(); controller.close(); });
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
```
Client:
```ts
useEffect(() => {
  const es = new EventSource("/api/events");
  es.addEventListener("notification", e => {
    const n = NotificationSchema.parse(JSON.parse(e.data));
    qc.setQueryData(["notifications"], (old: Notification[] = []) => [n, ...old]);
  });
  return () => es.close();   // EventSource auto-reconnects
}, [qc]);
```

## Resilient WebSocket hook
```ts
export function useSocket(url: string, onMessage: (m: unknown) => void) {
  const handler = useRef(onMessage); handler.current = onMessage;
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  useEffect(() => {
    let ws: WebSocket, attempt = 0, timer: ReturnType<typeof setTimeout>, stopped = false;
    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => { attempt = 0; setStatus("open"); };
      ws.onmessage = e => handler.current(JSON.parse(e.data));
      ws.onclose = () => {
        setStatus("closed");
        if (stopped) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempt++) * (0.5 + Math.random());
        timer = setTimeout(connect, delay);
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); ws?.close(); };
  }, [url]);
  return status;
}
```
Also: heartbeat pings, resume on `online`/`visibilitychange`, show a "Reconnecting…" indicator.

## Sync strategy with cached data
1. **Invalidate** on event (simplest, always correct): `qc.invalidateQueries({ queryKey: ["orders"] })`.
2. **Patch** cache from event payload for high-frequency updates.
3. After reconnect, **refetch** to recover missed events (or replay from `lastEventId`/sequence number).
Events should carry `id`, `type`, `version`/`updatedAt` — ignore stale versions; dedupe by id.

## Security
- Authenticate the connection (cookie or short-lived token), never trust client-sent user ids.
- Authorize each channel subscription (`private-org-123` only for members).
- Validate every inbound message with zod; rate-limit client messages.
- Check `Origin` on WS upgrade.

## Scaling
- Multiple server instances → pub/sub backbone (Redis, NATS, Postgres LISTEN/NOTIFY).
- Emit events from the write path via outbox pattern to avoid lost events.
- Throttle UI updates (batch with `requestAnimationFrame` or 100ms buffer) for firehose streams.

## UX
- Presence and typing indicators are ephemeral — don't persist.
- Announce important live updates to screen readers with `aria-live="polite"`.
- Don't reorder lists under the user's cursor; show "5 new items" banner instead.

## Checklist
- [ ] Transport matches need & hosting
- [ ] Reconnect with jittered backoff + heartbeat
- [ ] Gap recovery after reconnect
- [ ] Auth on connect + channel authz
- [ ] Messages validated; UI updates batched
- [ ] Cleanup on unmount (no leaked connections)
