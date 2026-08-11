import { describe, expect, it } from 'vitest'
import { formatDateOfIssue, resolvePostalCircleName } from './covers'

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
