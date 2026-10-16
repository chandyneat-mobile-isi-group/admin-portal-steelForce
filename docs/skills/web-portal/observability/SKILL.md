---
name: observability
description: Instrument web apps for production visibility — structured logging (pino), OpenTelemetry tracing via Next.js instrumentation.ts, metrics, error tracking (Sentry), Real User Monitoring and Web Vitals reporting, request IDs, health checks, dashboards, SLOs, and alerting. Use this skill whenever the user asks about logging, monitoring, tracing, metrics, alerts, debugging production issues, Sentry/Datadog/Grafana setup, or "how do I know if my app is healthy".
---

# Observability

You can't fix what you can't see. Instrument the **three pillars** (logs, metrics, traces) plus **errors** and **real-user** data, all correlated by request/trace ID.

## Structured logging
```ts
// lib/logger.ts
import "server-only";
import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "web-portal", env: process.env.NODE_ENV, version: process.env.APP_VERSION },
  redact: { paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token", "*.email"], censor: "[redacted]" },
  formatters: { level: label => ({ level: label }) },
});
```
Rules:
- JSON logs, one event per line, with `requestId`/`traceId`, `userId`, `orgId`, `route`, `durationMs`.
- Levels: `error` (needs action), `warn` (degraded), `info` (business events), `debug` (off in prod).
- Log events, not prose: `logger.info({ orderId, amount }, "order.created")`.
- Never log secrets, tokens, full PII.

## Request correlation
```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const id = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = new Headers(req.headers); headers.set("x-request-id", id);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", id);
  return res;
}
```
Read with `headers()` in server code and attach to child loggers: `logger.child({ requestId })`.

## Tracing (OpenTelemetry)
```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";
export function register() { registerOTel({ serviceName: "web-portal" }); }
export async function onRequestError(err: unknown, request: unknown, context: unknown) {
  // forward to Sentry / logger
}
```
Next.js auto-creates spans for routes, rendering, and fetch. Add custom spans for business-critical work:
```ts
import { trace } from "@opentelemetry/api";
const tracer = trace.getTracer("portal");
export const chargeCustomer = (id: string) => tracer.startActiveSpan("billing.charge", async span => {
  try { span.setAttribute("customer.id", id); return await stripeCharge(id); }
  catch (e) { span.recordException(e as Error); span.setStatus({ code: 2 }); throw e; }
  finally { span.end(); }
});
```
Export OTLP to Grafana Tempo, Honeycomb, Datadog, New Relic, etc. Instrument DB (Prisma tracing) to see query spans.

## Metrics
Track **RED** per endpoint (Rate, Errors, Duration p50/p95/p99) and **USE** for infra (Utilization, Saturation, Errors). Business metrics: signups, logins, orders, failed payments. Keep label cardinality low (no user IDs as labels).

## Error tracking
`@sentry/nextjs` wizard → client, server, edge configs; upload source maps in CI; set `release` and `environment`; enable tracing sample rate (e.g. 0.1) and session replay with masking for sensitive pages.

## Real User Monitoring
```tsx
"use client";
import { useReportWebVitals } from "next/web-vitals";
export function WebVitals() {
  useReportWebVitals(m => {
    navigator.sendBeacon("/api/vitals", JSON.stringify({ name: m.name, value: m.value, rating: m.rating, id: m.id, path: location.pathname }));
  });
  return null;
}
```
Or Vercel Speed Insights / Sentry / Datadog RUM. Segment by route and device.

## Health checks
```ts
// app/api/health/route.ts
export const dynamic = "force-dynamic";
export async function GET() {
  const checks = await Promise.allSettled([db.$queryRaw`SELECT 1`, redis.ping()]);
  const ok = checks.every(c => c.status === "fulfilled");
  return Response.json({ status: ok ? "ok" : "degraded", version: process.env.APP_VERSION }, { status: ok ? 200 : 503 });
}
```
Liveness (process up) vs readiness (dependencies ok). Add external uptime checks + synthetic Playwright checks on key flows.

## SLOs & alerting
- Define SLIs: availability (non-5xx ratio), latency (p95 < 500ms for API), LCP p75 < 2.5s.
- SLO e.g. 99.9% monthly; alert on **error-budget burn rate** (fast: 14× over 1h, slow: 6× over 6h) instead of raw thresholds.
- Alerts must be actionable, routed to on-call, and link to a runbook + dashboard.
- Warn-level stuff goes to dashboards/tickets, not pages.

## Dashboards (minimum)
1. Service overview: traffic, error rate, p95 latency, deploy markers
2. Dependencies: DB latency/connections, external API errors
3. Frontend: Web Vitals by route, JS errors
4. Business: signups, conversions, failed payments

## Checklist
- [ ] JSON logs with requestId, redaction configured
- [ ] OTel tracing in instrumentation.ts with DB spans
- [ ] Sentry with source maps and releases
- [ ] Web Vitals collected from real users
- [ ] Health endpoint + uptime monitor
- [ ] SLOs defined; burn-rate alerts with runbooks
