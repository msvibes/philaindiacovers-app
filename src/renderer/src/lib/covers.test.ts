import { describe, expect, it } from 'vitest'
import { formatDateOfIssue, resolvePostalCircleName, withFallback } from './covers'

describe('formatDateOfIssue', () => {
  it('formats a real ISO date courteously', () => {
    expect(formatDateOfIssue('2023-05-19')).toBe('19 May 2023')
  })

  it('falls back to courteous copy, not a blank, when the date is missing', () => {
    expect(formatDateOfIssue(null)).toBe('Date not recorded yet')
  })
})

describe('resolvePostalCircleName', () => {
  it('resolves a single embedded object (the shape Supabase actually returns for this FK)', () => {
    expect(resolvePostalCircleName({ name: 'Uttar Pradesh' })).toBe('Uttar Pradesh')
  })

  it('resolves an array shape defensively, in case PostgREST embeds it that way', () => {
    expect(resolvePostalCircleName([{ name: 'Uttar Pradesh' }])).toBe('Uttar Pradesh')
  })

  it('returns null, not a crash, when there is no postal circle at all', () => {
    expect(resolvePostalCircleName(null)).toBeNull()
  })
})

describe('withFallback', () => {
  // T-09's detail fields (name_of_cover, cancellation/cachet/overall
  // description, place_of_issue) are inserted directly from sanitized CSV
  // text with no `|| null` conversion (confirmed by reading
  // confirm-import/route.ts, Admin repo) — a blank source cell becomes
  // '', not null. gi_registration_number is the one field genuinely
  // insertable as null (already proven live). The DB columns themselves
  // stay nullable regardless, so both shapes are real and both get the
  // same courteous treatment here.
  it('returns the real value when present', () => {
    expect(withFallback('Varanasi', 'Place of issue not recorded yet')).toBe('Varanasi')
  })

  it('falls back on null — the shape gi_registration_number actually has live, today', () => {
    expect(withFallback(null, 'Registration number not recorded yet')).toBe(
      'Registration number not recorded yet'
    )
  })

  it('falls back on an empty string — the realistic "missing" shape for the other five fields via the current import path', () => {
    expect(withFallback('', 'Place of issue not recorded yet')).toBe(
      'Place of issue not recorded yet'
    )
  })

  it('falls back on a whitespace-only string too, not just exactly empty', () => {
    expect(withFallback('   ', 'Place of issue not recorded yet')).toBe(
      'Place of issue not recorded yet'
    )
  })

  it('falls back on undefined, defensively', () => {
    expect(withFallback(undefined, 'Place of issue not recorded yet')).toBe(
      'Place of issue not recorded yet'
    )
  })
})
