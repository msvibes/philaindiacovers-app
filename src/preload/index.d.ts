import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  CachedCoverRow,
  CacheFilterParams,
  CachePageParams,
  CacheQueryParams
} from '../main/localCache'

interface CacheApi {
  replaceCache: (rows: CachedCoverRow[], facets: unknown) => Promise<void>
  queryPage: (params: CachePageParams) => Promise<{ covers: CachedCoverRow[]; totalCount: number }>
  queryCount: (params: CacheFilterParams) => Promise<number>
  queryOrderedIds: (params: CacheQueryParams) => Promise<string[]>
  queryCoverById: (id: string) => Promise<CachedCoverRow | null>
  queryCoversByIds: (ids: string[]) => Promise<CachedCoverRow[]>
  getFacets: () => Promise<unknown | null>
  getLastSyncedAt: () => Promise<string | null>
}

interface Api {
  cache: CacheApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
