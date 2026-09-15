import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useViewedToday } from './useViewedToday'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useViewedToday', () => {
  it('starts at 0 when nothing is stored yet', () => {
    const { result } = renderHook(() => useViewedToday())
    expect(result.current.viewedTodayCount).toBe(0)
  })

  it('counts a view', () => {
    const { result } = renderHook(() => useViewedToday())
    act(() => result.current.recordViewToday('cover-1'))
    expect(result.current.viewedTodayCount).toBe(1)
  })

  it('dedupes — reopening the same cover does not inflate the count', () => {
    const { result } = renderHook(() => useViewedToday())
    act(() => result.current.recordViewToday('cover-1'))
    act(() => result.current.recordViewToday('cover-1'))
    act(() => result.current.recordViewToday('cover-1'))
    expect(result.current.viewedTodayCount).toBe(1)
  })

  it('counts distinct covers separately', () => {
    const { result } = renderHook(() => useViewedToday())
    act(() => result.current.recordViewToday('cover-1'))
    act(() => result.current.recordViewToday('cover-2'))
    act(() => result.current.recordViewToday('cover-1'))
    expect(result.current.viewedTodayCount).toBe(2)
  })

  it('persists across a fresh hook instance, simulating an app restart', () => {
    const first = renderHook(() => useViewedToday())
    act(() => first.result.current.recordViewToday('cover-1'))

    const second = renderHook(() => useViewedToday())
    expect(second.result.current.viewedTodayCount).toBe(1)
  })

  it("resets to 0 on a new calendar day — yesterday's count is not carried over", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 23, 0))
    const first = renderHook(() => useViewedToday())
    act(() => first.result.current.recordViewToday('cover-1'))
    expect(first.result.current.viewedTodayCount).toBe(1)

    vi.setSystemTime(new Date(2026, 8, 8, 9, 0))
    const second = renderHook(() => useViewedToday())
    expect(second.result.current.viewedTodayCount).toBe(0)
  })

  it('a view recorded on the new day starts a fresh count, not appended to the stale one', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 23, 0))
    const first = renderHook(() => useViewedToday())
    act(() => first.result.current.recordViewToday('cover-1'))

    vi.setSystemTime(new Date(2026, 8, 8, 9, 0))
    const second = renderHook(() => useViewedToday())
    act(() => second.result.current.recordViewToday('cover-2'))
    expect(second.result.current.viewedTodayCount).toBe(1)
  })
})
