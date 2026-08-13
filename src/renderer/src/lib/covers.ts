import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface VerifiedCover {
  id: string
  giItemName: string | null
  productCategory: string | null
  dateOfIssue: string | null
  imageFile: string
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
  nameOfCover: string | null
  giRegistrationNumber: string | null
  cancellationDescription: string | null
  cachetDescription: string | null
  overallDescription: string | null
  placeOfIssue: string | null
}

interface RawPostalCircle {
  name: string
}

interface RawCoverRow {
  id: string
  gi_item_name: string | null
  product_category: string | null
  date_of_issue: string | null
  image_file: string
  postal_circles: RawPostalCircle | RawPostalCircle[] | null
}

interface RawCoverDetailRow extends RawCoverRow {
  name_of_cover: string | null
  gi_registration_number: string | null
  cancellation_description: string | null
  cachet_description: string | null
  overall_description: string | null
  place_of_issue: string | null
}

export function resolvePostalCircleName(
  postalCircles: RawPostalCircle | RawPostalCircle[] | null
): string | null {
  if (!postalCircles) return null
  return Array.isArray(postalCircles) ? (postalCircles[0]?.name ?? null) : postalCircles.name
}

function mapCoverRow(row: RawCoverRow): VerifiedCover {
  return {
    id: row.id,
    giItemName: row.gi_item_name,
    productCategory: row.product_category,
    dateOfIssue: row.date_of_issue,
    imageFile: row.image_file,
    postalCircleName: resolvePostalCircleName(row.postal_circles)
  }
}

// Fetches the public catalogue — only 'verified' covers, per RLS (covers has
// no anon grant at all; this only succeeds for an authenticated Collector
// session). No filtering/search/sort — that's US-08/09/10, not this task.
// Takes an optional client (defaults to the app's shared singleton) so
// tests can call this as a specific, differently-authenticated real
// session — mirrors the Admin repo's fetchReviewQueue(client) pattern.
export async function fetchVerifiedCovers(
  client: SupabaseClient = supabase
): Promise<VerifiedCover[]> {
  const { data, error } = await client
    .from('covers')
    .select('id, gi_item_name, product_category, date_of_issue, image_file, postal_circles(name)')
    .eq('verification_status', 'verified')

  if (error) throw error

  const rows = (data ?? []) as unknown as RawCoverRow[]
  return rows.map(mapCoverRow)
}

// Fetches one cover's full record for the detail view (T-09). Filtered to
// 'verified' here too, same defense-in-depth as the list query — RLS
// already enforces this at the row level, but the client-side query
// mirrors it rather than assuming UI-level trust (a Collector should never
// be able to reach a draft/flagged cover's detail by guessing an id).
// Returns null, not an error, when nothing matches — the caller treats
// that as "not found" rather than "something went wrong". Same optional
// client parameter as fetchVerifiedCovers, for the same reason.
export async function fetchVerifiedCoverById(
  id: string,
  client: SupabaseClient = supabase
): Promise<CoverDetail | null> {
  const { data, error } = await client
    .from('covers')
    .select(
      `id, gi_item_name, product_category, date_of_issue, image_file, postal_circles(name),
       name_of_cover, gi_registration_number, cancellation_description, cachet_description,
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
    nameOfCover: row.name_of_cover,
    giRegistrationNumber: row.gi_registration_number,
    cancellationDescription: row.cancellation_description,
    cachetDescription: row.cachet_description,
    overallDescription: row.overall_description,
    placeOfIssue: row.place_of_issue
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
