import { DatabaseSync } from 'node:sqlite'

// T-16: local SQLite cache, synced from Supabase on successful connection.
// Lives entirely in the main process (node:sqlite has no renderer-side
// equivalent) — the renderer's covers.ts already owns all the real
// Supabase query/filter logic, so this module mirrors that logic in raw
// SQL rather than duplicating the fetch layer too. Functions here take a
// DatabaseSync instance as a parameter, same dependency-injection pattern
// covers.ts already uses for its Supabase client, so this is directly
// unit-testable against a real in-memory (':memory:') database — no
// Electron runtime needed for that.
//
// Facets are deliberately NOT recomputed here from raw cached rows — the
// already-tested fetchCatalogueFacets() aggregation is cached as JSON at
// sync time instead (facets only change when new covers get verified, an
// infrequent, Admin-driven event; "last synced" is already this whole
// feature's own framing). Reimplementing that aggregation in SQL would
// duplicate non-trivial logic that could quietly drift from the online
// version — a real risk, not a hypothetical one.

export interface CachedCoverRow {
  id: string
  giItemName: string | null
  nameOfCover: string | null
  productCategory: string | null
  dateOfIssue: string | null
  imageFile: string
  postalCircleId: string | null
  postalCircleName: string | null
  giRegistrationNumber: string | null
  cancellationDescription: string | null
  cachetDescription: string | null
  overallDescription: string | null
  placeOfIssue: string | null
  // Sync/sort-only — never exposed to renderer callers as part of a
  // VerifiedCover/CoverDetail, only used for the 'newest' ORDER BY here.
  verifiedAt: string | null
}

// sort lives on a separate, extending interface — mirrors covers.ts's own
// Pick<CatalogueQueryParams, ...> pattern for countCatalogueMatches, which
// genuinely has no use for a sort order.
export interface CacheFilterParams {
  postalCircleIds?: string[]
  productCategories?: string[]
  years?: number[]
  searchTerm?: string
  giItemName?: string
}

export interface CacheQueryParams extends CacheFilterParams {
  sort: 'newest' | 'alphabetical'
}

export interface CachePageParams extends CacheQueryParams {
  page: number
  pageSize: number
}

interface RawRow {
  id: string
  gi_item_name: string | null
  name_of_cover: string | null
  product_category: string | null
  date_of_issue: string | null
  image_file: string
  postal_circle_id: string | null
  postal_circle_name: string | null
  gi_registration_number: string | null
  cancellation_description: string | null
  cachet_description: string | null
  overall_description: string | null
  place_of_issue: string | null
  verified_at: string | null
}

function mapRow(row: RawRow): CachedCoverRow {
  return {
    id: row.id,
    giItemName: row.gi_item_name,
    nameOfCover: row.name_of_cover,
    productCategory: row.product_category,
    dateOfIssue: row.date_of_issue,
    imageFile: row.image_file,
    postalCircleId: row.postal_circle_id,
    postalCircleName: row.postal_circle_name,
    giRegistrationNumber: row.gi_registration_number,
    cancellationDescription: row.cancellation_description,
    cachetDescription: row.cachet_description,
    overallDescription: row.overall_description,
    placeOfIssue: row.place_of_issue,
    verifiedAt: row.verified_at
  }
}

export function openCacheDb(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS covers (
      id TEXT PRIMARY KEY,
      gi_item_name TEXT,
      name_of_cover TEXT,
      product_category TEXT,
      date_of_issue TEXT,
      image_file TEXT NOT NULL,
      postal_circle_id TEXT,
      postal_circle_name TEXT,
      gi_registration_number TEXT,
      cancellation_description TEXT,
      cachet_description TEXT,
      overall_description TEXT,
      place_of_issue TEXT,
      verified_at TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
  return db
}

// Same stripped-character set as covers.ts's sanitizeSearchTerm — kept as
// its own small copy since src/main and src/renderer are separate
// TypeScript projects (tsconfig.node.json only includes src/main/**,
// tsconfig.web.json only src/renderer/src/**) with no shared-code folder
// to import across that boundary. If this set ever changes, update both.
function sanitizeSearchTerm(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/[,()%*]/g, '')
}

// Mirrors covers.ts's applyCatalogueFilters — same filters, same
// precedence, translated to SQL so the two query engines can't quietly
// diverge on what counts as a "match".
function buildWhereClause(params: CacheFilterParams): {
  clause: string
  args: (string | number)[]
} {
  const conditions: string[] = []
  const args: (string | number)[] = []

  if (params.postalCircleIds?.length) {
    conditions.push(`postal_circle_id IN (${params.postalCircleIds.map(() => '?').join(',')})`)
    args.push(...params.postalCircleIds)
  }
  if (params.productCategories?.length) {
    conditions.push(`product_category IN (${params.productCategories.map(() => '?').join(',')})`)
    args.push(...params.productCategories)
  }
  if (params.years?.length) {
    const yearGroups = params.years.map(() => `(date_of_issue >= ? AND date_of_issue < ?)`)
    conditions.push(`(${yearGroups.join(' OR ')})`)
    for (const year of params.years) {
      args.push(`${year}-01-01`, `${year + 1}-01-01`)
    }
  }
  if (params.giItemName) {
    conditions.push('gi_item_name = ?')
    args.push(params.giItemName)
  }
  const term = sanitizeSearchTerm(params.searchTerm)
  if (term) {
    conditions.push('(gi_item_name LIKE ? OR name_of_cover LIKE ? OR overall_description LIKE ?)')
    const wildcard = `%${term}%`
    args.push(wildcard, wildcard, wildcard)
  }

  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', args }
}

// SQLite's default ORDER BY ASC puts NULLs first — the opposite of the
// online query's explicit nullsFirst: false for alphabetical sort (T-13's
// own tested "null names sort last" behavior). The (name_of_cover IS
// NULL) clause forces the same nulls-last order here.
function buildOrderClause(sort: 'newest' | 'alphabetical'): string {
  return sort === 'alphabetical'
    ? 'ORDER BY (name_of_cover IS NULL), name_of_cover ASC'
    : 'ORDER BY verified_at DESC'
}

export function replaceCache(db: DatabaseSync, rows: CachedCoverRow[], facets: unknown): void {
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM covers')
    const insert = db.prepare(`
      INSERT INTO covers (
        id, gi_item_name, name_of_cover, product_category, date_of_issue,
        image_file, postal_circle_id, postal_circle_name,
        gi_registration_number, cancellation_description, cachet_description,
        overall_description, place_of_issue, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const row of rows) {
      insert.run(
        row.id,
        row.giItemName,
        row.nameOfCover,
        row.productCategory,
        row.dateOfIssue,
        row.imageFile,
        row.postalCircleId,
        row.postalCircleName,
        row.giRegistrationNumber,
        row.cancellationDescription,
        row.cachetDescription,
        row.overallDescription,
        row.placeOfIssue,
        row.verifiedAt
      )
    }
    const setMeta = db.prepare(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    setMeta.run('last_synced_at', new Date().toISOString())
    setMeta.run('facets', JSON.stringify(facets))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function getLastSyncedAt(db: DatabaseSync): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('last_synced_at') as
    { value: string } | undefined
  return row?.value ?? null
}

export function getFacets(db: DatabaseSync): unknown | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('facets') as
    { value: string } | undefined
  return row ? JSON.parse(row.value) : null
}

export function queryPage(
  db: DatabaseSync,
  params: CachePageParams
): { covers: CachedCoverRow[]; totalCount: number } {
  const { clause, args } = buildWhereClause(params)
  const order = buildOrderClause(params.sort)
  const offset = (params.page - 1) * params.pageSize

  const countRow = db.prepare(`SELECT COUNT(*) AS n FROM covers ${clause}`).get(...args) as {
    n: number
  }
  const rows = db
    .prepare(`SELECT * FROM covers ${clause} ${order} LIMIT ? OFFSET ?`)
    .all(...args, params.pageSize, offset) as unknown as RawRow[]

  return { covers: rows.map(mapRow), totalCount: countRow.n }
}

export function queryCount(db: DatabaseSync, params: CacheFilterParams): number {
  const { clause, args } = buildWhereClause(params)
  const row = db.prepare(`SELECT COUNT(*) AS n FROM covers ${clause}`).get(...args) as {
    n: number
  }
  return row.n
}

export function queryOrderedIds(db: DatabaseSync, params: CacheQueryParams): string[] {
  const { clause, args } = buildWhereClause(params)
  const order = buildOrderClause(params.sort)
  const rows = db.prepare(`SELECT id FROM covers ${clause} ${order}`).all(...args) as unknown as {
    id: string
  }[]
  return rows.map((r) => r.id)
}

export function queryCoverById(db: DatabaseSync, id: string): CachedCoverRow | null {
  const row = db.prepare('SELECT * FROM covers WHERE id = ?').get(id) as RawRow | undefined
  return row ? mapRow(row) : null
}

export function queryCoversByIds(db: DatabaseSync, ids: string[]): CachedCoverRow[] {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM covers WHERE id IN (${placeholders})`)
    .all(...ids) as unknown as RawRow[]
  const byId = new Map(rows.map((r) => [r.id, mapRow(r)]))
  return ids.map((id) => byId.get(id)).filter((c): c is CachedCoverRow => c !== undefined)
}
