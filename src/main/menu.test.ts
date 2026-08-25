import { describe, expect, it, vi } from 'vitest'
import { buildMenuTemplate } from './menu'

// Pure template construction, no real Electron API involved — testable
// without booting an app, matching T-24's own reasoning for extracting
// this out of index.ts.
vi.mock('electron', () => ({
  shell: { openExternal: vi.fn() }
}))

describe('buildMenuTemplate', () => {
  it('has exactly the four top-level menus, in order', () => {
    const template = buildMenuTemplate(false)
    expect(template.map((item) => item.label)).toEqual(['File', 'Edit', 'View', 'Help'])
  })

  it('excludes Toggle DevTools outside dev mode', () => {
    const template = buildMenuTemplate(false)
    const view = template.find((item) => item.label === 'View')
    const roles = (view?.submenu as { role?: string }[]).map((item) => item.role)
    expect(roles).not.toContain('toggleDevTools')
  })

  it('includes Toggle DevTools in dev mode', () => {
    const template = buildMenuTemplate(true)
    const view = template.find((item) => item.label === 'View')
    const roles = (view?.submenu as { role?: string }[]).map((item) => item.role)
    expect(roles).toContain('toggleDevTools')
  })

  it('File has a real Quit item, not in-page HTML standing in for one', () => {
    const template = buildMenuTemplate(false)
    const file = template.find((item) => item.label === 'File')
    const roles = (file?.submenu as { role?: string }[]).map((item) => item.role)
    expect(roles).toContain('quit')
  })
})
