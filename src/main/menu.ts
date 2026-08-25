import { shell, type MenuItemConstructorOptions } from 'electron'

const REPO_URL = 'https://github.com/msvibes/philaindiacovers-app'
const ISSUES_URL = `${REPO_URL}/issues`

// T-24 (FR-26/US-54): a real native menu bar, not in-page HTML. Kept
// deliberately minimal — no About/disclaimer content here, that's T-27's
// Settings-screen territory, not this menu. Pure function (no direct
// Electron API calls beyond referencing shell/roles) so it's testable
// without booting a real app.
export function buildMenuTemplate(isDev: boolean): MenuItemConstructorOptions[] {
  return [
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' } as MenuItemConstructorOptions] : []),
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'View Source on GitHub',
          click: () => shell.openExternal(REPO_URL)
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal(ISSUES_URL)
        }
      ]
    }
  ]
}
