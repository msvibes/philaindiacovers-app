import { describe, expect, it } from 'vitest'
import { classifyProfileCheck } from './checkCollectorProfile.mjs'

describe('classifyProfileCheck', () => {
  it('recognizes handle_new_user() firing correctly', () => {
    expect(classifyProfileCheck({ id: 'x', role: 'collector' })).toEqual({
      status: 'fired-correctly'
    })
  })

  it('flags a profiles row with an unexpected role, distinct from a full regression', () => {
    expect(classifyProfileCheck({ id: 'x', role: 'admin' })).toEqual({
      status: 'wrong-role',
      role: 'admin'
    })
  })

  it("flags the real regression — no profiles row created at all — same failure mode as the Admin repo's 2026-08-11 NULL-role incident", () => {
    expect(classifyProfileCheck(null)).toEqual({ status: 'missing-regression' })
  })
})
