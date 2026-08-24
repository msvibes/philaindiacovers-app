import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRecentlyViewed } from './useRecentlyViewed'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useRecentlyViewed', () => {
  it('starts empty when nothing is stored yet', () => {
    const { result } = renderHook(() => useRecentlyViewed())
    expect(result.current.recentIds).toEqual([])
  })

  it('records a view as most-recent-first', () => {
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => result.current.recordView('cover-1'))
    act(() => result.current.recordView('cover-2'))
    expect(result.current.recentIds).toEqual(['cover-2', 'cover-1'])
  })

  it('dedupes — re-viewing an existing id moves it to the front instead of duplicating it', () => {
    const { result } = renderHook(() => useRecentlyViewed())
    act(() => result.current.recordView('cover-1'))
    act(() => result.current.recordView('cover-2'))
    act(() => result.current.recordView('cover-1'))
    expect(result.current.recentIds).toEqual(['cover-1', 'cover-2'])
  })

  it('caps at 8 most-recent ids', () => {
    const { result } = renderHook(() => useRecentlyViewed())
    for (let i = 0; i < 10; i++) {
      act(() => result.current.recordView(`cover-${i}`))
    }
    expect(result.current.recentIds).toHaveLength(8)
    expect(result.current.recentIds[0]).toBe('cover-9')
    expect(result.current.recentIds).not.toContain('cover-0')
    expect(result.current.recentIds).not.toContain('cover-1')
  })

  it('persists across a fresh hook instance, simulating an app restart', () => {
    const first = renderHook(() => useRecentlyViewed())
    act(() => first.result.current.recordView('cover-1'))

    const second = renderHook(() => useRecentlyViewed())
    expect(second.result.current.recentIds).toEqual(['cover-1'])
  })
})
