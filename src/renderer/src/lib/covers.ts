import { supabase } from './supabaseClient'

export interface VerifiedCover {
  id: string
  giItemName: string | null
  productCategory: string | null
  dateOfIssue: string | null
  imageFile: string | null
  postalCircleName: string | null
}

interface RawPostalCircle {
  name: string
}

interface RawCoverRow {
  id: string
  gi_item_name: string | null
  product_category: string | null
  date_of_issue: string | null
  image_file: string | null
  postal_circles: RawPostalCircle | RawPostalCircle[] | null
}

export function resolvePostalCircleName(
  postalCircles: RawPostalCircle | RawPostalCircle[] | null
): string | null {
  if (!postalCircles) return null
  return Array.isArray(postalCircles) ? (postalCircles[0]?.name ?? null) : postalCircles.name
}

// Fetches the public catalogue — only 'verified' covers, per RLS (covers has
// no anon grant at all; this only succeeds for an authenticated Collector
// session). No filtering/search/sort — that's US-08/09/10, not this task.
export async function fetchVerifiedCovers(): Promise<VerifiedCover[]> {
  const { data, error } = await supabase
    .from('covers')
    .select('id, gi_item_name, product_category, date_of_issue, image_file, postal_circles(name)')
    .eq('verification_status', 'verified')

  if (error) throw error

  const rows = (data ?? []) as unknown as RawCoverRow[]
  return rows.map((row) => ({
    id: row.id,
    giItemName: row.gi_item_name,
    productCategory: row.product_category,
    dateOfIssue: row.date_of_issue,
    imageFile: row.image_file,
    postalCircleName: resolvePostalCircleName(row.postal_circles)
  }))
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
