import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// T-16/T-17: every read function below tries Supabase first, falling back
// to the local SQLite cache (via window.api.cache, main-process IPC —
// node:sqlite has no renderer-side equivalent) when offline or when the
// online call fails for any reason. Deliberately not narrowed to
// network-specific errors only — a read-only degrade to last-known-cached
// data is a reasonable, non-broken outcome for any failure here, not just
// connectivity ones, and this app has no offline write path to protect
// (FR-16, App CLAUDE.md: writes stay blocked, never queued). No existing
// call site elsewhere in the app changes — Catalogue/Detail/Home keep
// calling these same exported functions.
function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function cachedRowToVerifiedCover(row: {
  id: string
  giItemName: string | null
  nameOfCover: string | null
  productCategory: string | null
  dateOfIssue: string | null
  imageFile: string
  postalCircleId: string | null
  postalCircleName: string | null
}): VerifiedCover {
  return {
    id: row.id,
    giItemName: row.giItemName,
    nameOfCover: row.nameOfCover,
    productCategory: row.productCategory,
    dateOfIssue: row.dateOfIssue,
    imageFile: row.imageFile,
    postalCircleId: row.postalCircleId,
    postalCircleName: row.postalCircleName
  }
}

export interface VerifiedCover {
  id: string
  giItemName: string | null
  nameOfCover: string | null
  productCategory: string | null
  dateOfIssue: string | null
  imageFile: string
  postalCircleId: string | null
  postalCircleName: string | null
}

// T-09 fields: everything the catalogue list doesn't already show. Unlike
// the list's fields, none of these get an `|| null` conversion on the way
// in (see confirm-import/route.ts, Admin repo) — a blank CSV cell becomes
// '', not null, via the only import path that exists today. The DB columns
// themselves stay nullable regardless (no NOT NULL constraint), so null is
// still a real possibility outside that path. Both '' and null are treated
// as "missing" throughout this file and wherever these fields are rendered.
export interface CoverDetail extends VerifiedCover {
  giRegistrationNumber: string | null
  cancellationDescription: string | null
  cachetDescription: string | null
  overallDescription: string | null
  placeOfIssue: string | null
}

interface RawPostalCircle {
  id: string
  name: string
}

interface RawCoverRow {
  id: string
  gi_item_name: string | null
  name_of_cover: string | null
  product_category: string | null
  date_of_issue: string | null
  image_file: string
  postal_circles: RawPostalCircle | RawPostalCircle[] | null
}

interface RawCoverDetailRow extends RawCoverRow {
  gi_registration_number: string | null
  cancellation_description: string | null
  cachet_description: string | null
  overall_description: string | null
  place_of_issue: string | null
}

function resolvePostalCircle(
  postalCircles: RawPostalCircle | RawPostalCircle[] | null
): RawPostalCircle | null {
  if (!postalCircles) return null
  return Array.isArray(postalCircles) ? (postalCircles[0] ?? null) : postalCircles
}

export function resolvePostalCircleName(
  postalCircles: RawPostalCircle | RawPostalCircle[] | null
): string | null {
  return resolvePostalCircle(postalCircles)?.name ?? null
}

function mapCoverRow(row: RawCoverRow): VerifiedCover {
  const circle = resolvePostalCircle(row.postal_circles)
  return {
    id: row.id,
    giItemName: row.gi_item_name,
    nameOfCover: row.name_of_cover,
    productCategory: row.product_category,
    dateOfIssue: row.date_of_issue,
    imageFile: row.image_file,
    postalCircleId: circle?.id ?? null,
    postalCircleName: circle?.name ?? null
  }
}

const SELECT_COVER_ROW =
  'id, gi_item_name, name_of_cover, product_category, date_of_issue, image_file, postal_circles(id, name)'

const PAGE_SIZE = 24

export interface CatalogueQueryParams {
  postalCircleIds?: string[]
  productCategories?: string[]
  years?: number[]
  searchTerm?: string
  // Set only via FR-14's tappable GI Tag Name — an exact match against
  // gi_item_name, distinct from the free-text search fields above.
  giItemName?: string
  sort: 'newest' | 'alphabetical'
  page: number // 1-indexed
  pageSize?: number
}

export interface CataloguePage {
  covers: VerifiedCover[]
  totalCount: number
}

// Strips PostgREST .or()-string delimiter characters a user could type into
// search (`,`, `(`, `)`, `%`, `*`) — left unescaped these either break the
// or() filter string's own parsing or get interpreted as ilike wildcards.
export function sanitizeSearchTerm(raw?: string): string {
  return (raw ?? '').trim().replace(/[,()%*]/g, '')
}

// One .or() group per selected year, e.g. 2 selected years produces
// "and(date_of_issue.gte.2019-01-01,date_of_issue.lt.2020-01-01),and(...)".
// date_of_issue is a plain Postgres `date` column (confirmed against
// Admin/supabase/migrations/20260730162104_create_covers.sql), so these
// year-boundary string comparisons are unambiguous — no timezone concerns.
function buildYearFilter(years: number[]): string {
  return years
    .map((year) => `and(date_of_issue.gte.${year}-01-01,date_of_issue.lt.${year + 1}-01-01)`)
    .join(',')
}

function buildSearchFilter(term: string): string {
  return `gi_item_name.ilike.%${term}%,name_of_cover.ilike.%${term}%,overall_description.ilike.%${term}%`
}

// Applies every filter shared between fetchCataloguePage and
// countCatalogueMatches, in the same order, so the two queries can never
// silently diverge in what they consider a "match". Two separate .or()
// calls (year-group, then search-term) are deliberate, not an oversight —
// confirmed via the installed @supabase/postgrest-js source that .or()
// appends a new query-string param rather than overwriting a prior one, so
// they combine as independent ANDed filters. Confirmed live against the
// dev project before this was relied on for real (see PROGRESS.md).
function applyCatalogueFilters<
  T extends {
    or: (filters: string) => T
    in: (column: string, values: (string | number)[]) => T
    eq: (column: string, value: string) => T
  }
>(
  query: T,
  params: Pick<
    CatalogueQueryParams,
    'postalCircleIds' | 'productCategories' | 'years' | 'searchTerm' | 'giItemName'
  >
): T {
  let q = query
  if (params.postalCircleIds?.length) {
    q = q.in('postal_circle_id', params.postalCircleIds)
  }
  if (params.productCategories?.length) {
    q = q.in('product_category', params.productCategories)
  }
  if (params.years?.length) {
    q = q.or(buildYearFilter(params.years))
  }
  if (params.giItemName) {
    q = q.eq('gi_item_name', params.giItemName)
  }
  const term = sanitizeSearchTerm(params.searchTerm)
  if (term) {
    q = q.or(buildSearchFilter(term))
  }
  return q
}

async function fetchCataloguePageOnline(
  params: CatalogueQueryParams,
  client: SupabaseClient
): Promise<CataloguePage> {
  const pageSize = params.pageSize ?? PAGE_SIZE
  const from = (params.page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('covers')
    .select(SELECT_COVER_ROW, { count: 'exact' })
    .eq('verification_status', 'verified')

  query = applyCatalogueFilters(query, params)

  query =
    params.sort === 'alphabetical'
      ? query.order('name_of_cover', { ascending: true, nullsFirst: false })
      : query.order('verified_at', { ascending: false })

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = (data ?? []) as unknown as RawCoverRow[]
  return { covers: rows.map(mapCoverRow), totalCount: count ?? 0 }
}

// Fetches one page of the public catalogue — only 'verified' covers, per
// RLS (covers has no anon grant at all; this only succeeds for an
// authenticated Collector session — confirmed directly against
// Admin/supabase/migrations/20260804151630_rls_policies_covers.sql, which
// enforces current_profile_role() = 'collector' AND verification_status =
// 'verified' at the database level regardless of what this query sends).
// Supersedes the old no-args fetchVerifiedCovers() (US-08/09/10, T-18).
// T-16/T-17: falls back to the local SQLite cache when offline or on any
// online-fetch failure — see this file's top-of-file note.
export async function fetchCataloguePage(
  params: CatalogueQueryParams,
  client: SupabaseClient = supabase
): Promise<CataloguePage> {
  if (!isOffline()) {
    try {
      return await fetchCataloguePageOnline(params, client)
    } catch {
      // fall through to cache
    }
  }
  const pageSize = params.pageSize ?? PAGE_SIZE
  const { covers, totalCount } = await window.api.cache.queryPage({ ...params, pageSize })
  return { covers: covers.map(cachedRowToVerifiedCover), totalCount }
}

type CatalogueMatchParams = Pick<
  CatalogueQueryParams,
  'postalCircleIds' | 'productCategories' | 'years' | 'searchTerm' | 'giItemName'
>

async function countCatalogueMatchesOnline(
  params: CatalogueMatchParams,
  client: SupabaseClient
): Promise<number> {
  let query = client
    .from('covers')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified')

  query = applyCatalogueFilters(query, params)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

// Live "Show N covers" count for the filter panel's Apply button, against
// the pending (not-yet-applied) filter draft. head: true means no rows are
// transferred, just the count. T-16/T-17: falls back to the cache offline.
export async function countCatalogueMatches(
  params: CatalogueMatchParams,
  client: SupabaseClient = supabase
): Promise<number> {
  if (!isOffline()) {
    try {
      return await countCatalogueMatchesOnline(params, client)
    } catch {
      // fall through to cache
    }
  }
  return window.api.cache.queryCount(params)
}

type OrderedIdsParams = Pick<
  CatalogueQueryParams,
  'postalCircleIds' | 'productCategories' | 'years' | 'searchTerm' | 'giItemName' | 'sort'
>

async function fetchCatalogueOrderedIdsOnline(
  params: OrderedIdsParams,
  client: SupabaseClient
): Promise<string[]> {
  let query = client.from('covers').select('id').eq('verification_status', 'verified')

  query = applyCatalogueFilters(query, params)

  query =
    params.sort === 'alphabetical'
      ? query.order('name_of_cover', { ascending: true, nullsFirst: false })
      : query.order('verified_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => (row as { id: string }).id)
}

// Full ordered id list for the currently active filtered/searched/sorted
// query — no pagination. Powers FR-12's prev/next navigation: Detail view
// needs to know a cover's position within the same set Catalogue is
// showing, not just the 24-row page it happened to be clicked from.
// Deliberately id-only (cheap, same cost profile already accepted for
// fetchCatalogueFacets' own full-table scan) — the caller indexes into
// this array rather than re-fetching per navigation step. T-16/T-17: falls
// back to the cache offline.
export async function fetchCatalogueOrderedIds(
  params: OrderedIdsParams,
  client: SupabaseClient = supabase
): Promise<string[]> {
  if (!isOffline()) {
    try {
      return await fetchCatalogueOrderedIdsOnline(params, client)
    } catch {
      // fall through to cache
    }
  }
  return window.api.cache.queryOrderedIds(params)
}

async function fetchCoversByIdsOnline(
  ids: string[],
  client: SupabaseClient
): Promise<VerifiedCover[]> {
  const { data, error } = await client
    .from('covers')
    .select(SELECT_COVER_ROW)
    .in('id', ids)
    .eq('verification_status', 'verified')

  if (error) throw error

  const rows = (data ?? []) as unknown as RawCoverRow[]
  const covers = rows.map(mapCoverRow)
  const byId = new Map(covers.map((cover) => [cover.id, cover]))
  return ids
    .map((id) => byId.get(id))
    .filter((cover): cover is VerifiedCover => cover !== undefined)
}

// FR-28/US-53's recently-viewed strip (T-29's Home screen) hydrates raw
// stored ids into real cover objects here. .in() doesn't preserve input
// order, so the result is re-sorted to match `ids` — recentIds is already
// most-recent-first, and that order matters, not just tidiness. Still
// filtered to verification_status='verified' (same defense-in-depth as
// every other query in this file) — a cover viewed while verified but
// since flagged/unverified simply won't reappear, rather than leaking.
// T-16/T-17: falls back to the cache offline.
export async function fetchCoversByIds(
  ids: string[],
  client: SupabaseClient = supabase
): Promise<VerifiedCover[]> {
  if (ids.length === 0) return []

  if (!isOffline()) {
    try {
      return await fetchCoversByIdsOnline(ids, client)
    } catch {
      // fall through to cache
    }
  }
  const rows = await window.api.cache.queryCoversByIds(ids)
  return rows.map(cachedRowToVerifiedCover)
}

export interface CatalogueFacetOption<T = string> {
  value: T
  count: number
}

export interface CatalogueFacets {
  productCategories: CatalogueFacetOption[]
  postalCircles: CatalogueFacetOption<{ id: string; name: string }>[]
  years: CatalogueFacetOption<number>[]
}

async function fetchCatalogueFacetsOnline(client: SupabaseClient): Promise<CatalogueFacets> {
  const { data, error } = await client
    .from('covers')
    .select('product_category, date_of_issue, postal_circles(id, name)')
    .eq('verification_status', 'verified')

  if (error) throw error

  const categoryCounts = new Map<string, number>()
  const circleCounts = new Map<string, { name: string; count: number }>()
  const yearCounts = new Map<number, number>()

  for (const row of (data ?? []) as unknown as Array<{
    product_category: string | null
    date_of_issue: string | null
    postal_circles: RawPostalCircle | RawPostalCircle[] | null
  }>) {
    if (row.product_category) {
      categoryCounts.set(row.product_category, (categoryCounts.get(row.product_category) ?? 0) + 1)
    }
    const circle = resolvePostalCircle(row.postal_circles)
    if (circle) {
      const existing = circleCounts.get(circle.id)
      circleCounts.set(circle.id, { name: circle.name, count: (existing?.count ?? 0) + 1 })
    }
    if (row.date_of_issue) {
      const year = new Date(row.date_of_issue).getFullYear()
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
    }
  }

  return {
    productCategories: [...categoryCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    postalCircles: [...circleCounts.entries()]
      .map(([id, { name, count }]) => ({ value: { id, name }, count }))
      .sort((a, b) => a.value.name.localeCompare(b.value.name)),
    years: [...yearCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value)
  }
}

// One unpaginated scan of every verified cover's filterable columns,
// reduced client-side into per-option counts for the filter panel.
// Deliberately not a DB-side GROUP BY/RPC — PostgREST aggregate support
// isn't confirmed against this project's instance, and a full scan of the
// ~286-row verified set is cheap. Filter options are derived from what's
// actually in the dataset (a circle/category/year with zero verified
// covers doesn't appear as an option), matching the approved prototype's
// own behavior. T-16/T-17: offline, this returns whatever facets object
// was cached at the last successful sync (see syncCacheFromSupabase) —
// deliberately not recomputed from raw cached rows in SQL, since facets
// only change when new covers get verified, an infrequent event, and
// reimplementing this reduction in SQL would risk it quietly drifting
// from this exact, already-tested version.
export async function fetchCatalogueFacets(
  client: SupabaseClient = supabase
): Promise<CatalogueFacets> {
  if (!isOffline()) {
    try {
      return await fetchCatalogueFacetsOnline(client)
    } catch {
      // fall through to cache
    }
  }
  const cached = await window.api.cache.getFacets()
  return (
    (cached as CatalogueFacets | null) ?? { productCategories: [], postalCircles: [], years: [] }
  )
}

async function fetchVerifiedCoverByIdOnline(
  id: string,
  client: SupabaseClient
): Promise<CoverDetail | null> {
  const { data, error } = await client
    .from('covers')
    .select(
      `${SELECT_COVER_ROW},
       gi_registration_number, cancellation_description, cachet_description,
       overall_description, place_of_issue`
    )
    .eq('id', id)
    .eq('verification_status', 'verified')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as RawCoverDetailRow
  return {
    ...mapCoverRow(row),
    giRegistrationNumber: row.gi_registration_number,
    cancellationDescription: row.cancellation_description,
    cachetDescription: row.cachet_description,
    overallDescription: row.overall_description,
    placeOfIssue: row.place_of_issue
  }
}

// Fetches one cover's full record for the detail view (T-09). Filtered to
// 'verified' here too, same defense-in-depth as the list query — RLS
// already enforces this at the row level, but the client-side query
// mirrors it rather than assuming UI-level trust (a Collector should never
// be able to reach a draft/flagged cover's detail by guessing an id).
// Returns null, not an error, when nothing matches — the caller treats
// that as "not found" rather than "something went wrong". Same optional
// client parameter as fetchCataloguePage, for the same reason. T-16/T-17:
// falls back to the cache offline.
export async function fetchVerifiedCoverById(
  id: string,
  client: SupabaseClient = supabase
): Promise<CoverDetail | null> {
  if (!isOffline()) {
    try {
      return await fetchVerifiedCoverByIdOnline(id, client)
    } catch {
      // fall through to cache
    }
  }
  const row = await window.api.cache.queryCoverById(id)
  if (!row) return null
  return {
    ...cachedRowToVerifiedCover(row),
    giRegistrationNumber: row.giRegistrationNumber,
    cancellationDescription: row.cancellationDescription,
    cachetDescription: row.cachetDescription,
    overallDescription: row.overallDescription,
    placeOfIssue: row.placeOfIssue
  }
}

const BUCKET = 'cover-images'

// Mirrors the Admin repo's review-queue thumbnail pattern (T-07): the
// 'cover-images' bucket is private, so a plain <img src="..."> won't
// authenticate. download() attaches the caller's session automatically;
// the resulting Blob becomes a local object URL for the <img> tag.
export async function downloadCoverImageUrl(imageFile: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(imageFile)
  if (error || !data) throw error ?? new Error('No image data returned')
  return URL.createObjectURL(data)
}

export function formatDateOfIssue(dateOfIssue: string | null): string {
  if (!dateOfIssue) return 'Date not recorded yet'
  return new Date(dateOfIssue).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Treats '' the same as null/undefined — the realistic "missing" shape for
// the T-09 detail fields (see CoverDetail above), not just a defensive
// nicety. fallback should already read naturally as a full sentence/phrase
// on its own, e.g. "Registration number not recorded yet".
export function withFallback(value: string | null | undefined, fallback: string): string {
  return value && value.trim() !== '' ? value : fallback
}

interface RawSyncRow extends RawCoverDetailRow {
  verified_at: string | null
}

// T-16: "synced from Supabase on successful connection" — a full replace,
// not incremental (the verified set is ~286 rows, cheap to refetch
// wholesale; no need for delta-sync machinery at this size). Fetches every
// detail field, not just the list-view ones, so Detail view also works
// offline, not just the grid — the dataset is small enough that this
// costs nothing extra worth optimizing away. Called once on sign-in and
// again on every reconnect (see useOnlineStatus/App.tsx) and from T-17's
// manual refresh — this function itself doesn't decide when to run.
export async function syncCacheFromSupabase(client: SupabaseClient = supabase): Promise<void> {
  const [{ data, error }, facets] = await Promise.all([
    client
      .from('covers')
      .select(
        `${SELECT_COVER_ROW},
         gi_registration_number, cancellation_description, cachet_description,
         overall_description, place_of_issue, verified_at`
      )
      .eq('verification_status', 'verified'),
    fetchCatalogueFacetsOnline(client)
  ])

  if (error) throw error

  const rows = (data ?? []) as unknown as RawSyncRow[]
  const cacheRows = rows.map((row) => {
    const circle = resolvePostalCircle(row.postal_circles)
    return {
      id: row.id,
      giItemName: row.gi_item_name,
      nameOfCover: row.name_of_cover,
      productCategory: row.product_category,
      dateOfIssue: row.date_of_issue,
      imageFile: row.image_file,
      postalCircleId: circle?.id ?? null,
      postalCircleName: circle?.name ?? null,
      giRegistrationNumber: row.gi_registration_number,
      cancellationDescription: row.cancellation_description,
      cachetDescription: row.cachet_description,
      overallDescription: row.overall_description,
      placeOfIssue: row.place_of_issue,
      verifiedAt: row.verified_at
    }
  })

  await window.api.cache.replaceCache(cacheRows, facets)
}
