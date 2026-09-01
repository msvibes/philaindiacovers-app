import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// T-16/T-17: the only way the renderer can reach the main-process SQLite
// cache — node:sqlite has no renderer-side equivalent, and this app's
// context isolation (confirmed on) means no direct Node access from the
// renderer either way. Each method is a thin ipcRenderer.invoke wrapper;
// see src/main/index.ts's registerCacheIpcHandlers for the matching
// ipcMain.handle side — channel names must stay in sync between the two.
const api = {
  cache: {
    replaceCache: (rows: unknown, facets: unknown) =>
      ipcRenderer.invoke('cache:replaceCache', rows, facets),
    queryPage: (params: unknown) => ipcRenderer.invoke('cache:queryPage', params),
    queryCount: (params: unknown) => ipcRenderer.invoke('cache:queryCount', params),
    queryOrderedIds: (params: unknown) => ipcRenderer.invoke('cache:queryOrderedIds', params),
    queryCoverById: (id: string) => ipcRenderer.invoke('cache:queryCoverById', id),
    queryCoversByIds: (ids: string[]) => ipcRenderer.invoke('cache:queryCoversByIds', ids),
    getFacets: () => ipcRenderer.invoke('cache:getFacets'),
    getLastSyncedAt: () => ipcRenderer.invoke('cache:getLastSyncedAt')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
