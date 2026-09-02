import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useThemePreference } from './useThemePreference'

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('useThemePreference', () => {
  it('defaults to system when nothing is stored yet, applying no data-theme attribute', () => {
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
    // 'system' means base.css's plain prefers-color-scheme media query
    // alone decides — no attribute for it to key off.
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('setting an explicit preference applies it as data-theme, for the CSS override selectors to key off', () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('dark'))
    expect(document.documentElement.dataset.theme).toBe('dark')

    act(() => result.current.setPreference('light'))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('switching back to system clears the attribute again', () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('dark'))
    act(() => result.current.setPreference('system'))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('persists across a fresh hook instance, simulating an app restart', () => {
    const first = renderHook(() => useThemePreference())
    act(() => first.result.current.setPreference('dark'))

    const second = renderHook(() => useThemePreference())
    expect(second.result.current.preference).toBe('dark')
  })

  it('ignores a corrupted/unexpected stored value and falls back to system', () => {
    window.localStorage.setItem('philaindiacovers:themePreference', 'not-a-real-theme')
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
  })
})
