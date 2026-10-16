---
name: database-query-performance
description: Speed up database access for web apps — indexing strategy, EXPLAIN ANALYZE, N+1 detection, ORM (Prisma/Drizzle) query tuning, pagination (keyset vs offset), connection pooling for serverless, caching layers, and schema design for PostgreSQL/MySQL. Use this skill whenever queries are slow, pages time out, the user mentions indexes, Prisma/Drizzle performance, N+1, pagination, connection limits, or database load.
---

# Database Query Performance

Measure → find the slowest/most frequent queries → fix with indexes or query shape → verify with EXPLAIN.

## Find the problem
- Enable `pg_stat_statements`; sort by `total_exec_time` and `mean_exec_time`.
- Log slow queries (`log_min_duration_statement = 200ms`).
- ORM query logging in dev (Prisma `log: ["query"]`) to spot N+1.
- APM/OpenTelemetry DB spans per request.

## Read EXPLAIN
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE org_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 50;
```
Red flags: `Seq Scan` on large tables, `rows=` estimate far from actual (run `ANALYZE`), `Sort` with external merge, nested loops with large inner loops, high `Buffers: shared read`.

## Indexing
- Index columns in `WHERE`, `JOIN`, `ORDER BY` of hot queries.
- **Composite index order**: equality columns first, then range/sort: `(org_id, status, created_at DESC)`.
- Always index foreign keys (Postgres doesn't do it automatically).
- **Partial** index for common filters: `CREATE INDEX ON orders (org_id, created_at) WHERE status = 'open';`
- **Covering** index: `INCLUDE (total)` to enable index-only scans.
- Text search: `pg_trgm` GIN for `ILIKE '%x%'`; full-text `tsvector` for search.
- JSONB: GIN index or expression index on hot keys.
- Build in prod with `CREATE INDEX CONCURRENTLY`.
- Remove unused indexes (`pg_stat_user_indexes.idx_scan = 0`) — they slow writes.

Prisma:
```prisma
model Order {
  id        String   @id @default(cuid())
  orgId     String
  status    String
  createdAt DateTime @default(now())
  @@index([orgId, status, createdAt(sort: Desc)])
}
```

## Kill N+1
```ts
// ❌ 1 + N queries
const users = await db.user.findMany();
for (const u of users) u.orders = await db.order.findMany({ where: { userId: u.id } });
// ✅ one round trip (or 2 batched)
const users = await db.user.findMany({ include: { orders: { take: 5, orderBy: { createdAt: "desc" } } } });
// ✅ batch manually
const orders = await db.order.findMany({ where: { userId: { in: users.map(u => u.id) } } });
```
In GraphQL/resolvers use DataLoader.

## Select only what you need
```ts
db.user.findMany({ select: { id: true, name: true, avatarUrl: true } });
```
Avoid `SELECT *` on wide tables and large JSON/text columns in list views.

## Pagination
Offset (`OFFSET 100000`) scans and discards rows → slow for deep pages. Use **keyset/cursor**:
```sql
SELECT id, created_at FROM orders
WHERE org_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC LIMIT 50;
```
Include a unique tiebreaker (`id`). Avoid exact `COUNT(*)` on huge tables — use estimates or cap ("10,000+").

## Aggregations & dashboards
- Precompute with materialized views (refresh concurrently) or rollup tables updated by jobs.
- Cache results (Next.js cache tags / Redis) with sensible TTL.
- Push heavy analytics to a read replica or OLAP store.

## Writes
- Batch inserts (`createMany`), use transactions for multi-step writes, keep transactions short.
- Upserts with unique constraints instead of read-then-write races.
- Avoid long-running locks; add columns with defaults carefully on big tables.

## Serverless connections
- Use a pooler: PgBouncer (transaction mode), Supabase pooler, Neon pooled URL, Prisma Accelerate, or HTTP drivers (Neon serverless / PlanetScale).
- Reuse the client across invocations:
```ts
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
```
- Set `connection_limit` low per function; set statement timeouts.
- Co-locate DB region with compute.

## Caching layers
Request dedupe (`React.cache`) → app cache (Next cache/Redis) → HTTP/CDN cache. Invalidate on write by tag; never cache cross-tenant data under a shared key.

## Checklist
- [ ] Top queries identified via pg_stat_statements
- [ ] EXPLAIN shows index usage for hot paths
- [ ] FKs and composite indexes in place
- [ ] No N+1 in list views
- [ ] Keyset pagination for large lists
- [ ] Narrow selects
- [ ] Pooled connections; timeouts set
- [ ] Dashboards use precomputed/cached aggregates
