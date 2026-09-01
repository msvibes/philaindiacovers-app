import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  type CachedCoverRow,
  getFacets,
  getLastSyncedAt,
  openCacheDb,
  queryCount,
  queryCoverById,
  queryCoversByIds,
  queryOrderedIds,
  queryPage,
  replaceCache
} from './localCache'

function makeRow(overrides: Partial<CachedCoverRow>): CachedCoverRow {
  return {
    id: 'id-1',
    giItemName: 'Some GI Item',
    nameOfCover: 'Some Cover',
    productCategory: 'Textile',
    dateOfIssue: '2021-05-01',
    imageFile: 'some.jpg',
    postalCircleId: 'circle-1',
    postalCircleName: 'Tamil Nadu',
    giRegistrationNumber: null,
    cancellationDescription: null,
    cachetDescription: null,
    overallDescription: 'A silk cover',
    placeOfIssue: null,
    verifiedAt: '2023-01-01T00:00:00.000Z',
    ...overrides
  }
}

// Real, on-disk persistence — every other test in this file uses
// ':memory:' for speed, but that alone never proves openCacheDb/
// replaceCache actually write to a real file on a real path the way the
// main process does in production (app.getPath('userData')/cache.db). A
// real regression here (wrong path, silent write failure, an in-memory-
// only mode) would not be caught by the ':memory:' tests at all.
describe('localCache — real file persistence', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'localCache-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('openCacheDb creates a real file on disk, and replaceCache persists real data to it', () => {
    const dbPath = join(dir, 'cache.db')
    expect(existsSync(dbPath)).toBe(false)

    const fileDb = openCacheDb(dbPath)
    expect(existsSync(dbPath)).toBe(true)

    replaceCache(
      fileDb,
      [
        {
          id: 'real-file-id',
          giItemName: 'Real File Item',
          nameOfCover: 'Real File Cover',
          productCategory: null,
          dateOfIssue: null,
          imageFile: 'real.jpg',
          postalCircleId: null,
          postalCircleName: null,
          giRegistrationNumber: null,
          cancellationDescription: null,
          cachetDescription: null,
          overallDescription: null,
          placeOfIssue: null,
          verifiedAt: null
        }
      ],
      null
    )
    fileDb.close()

    expect(existsSync(dbPath)).toBe(true)
    expect(statSync(dbPath).size).toBeGreaterThan(0)

    // Re-open the same file path fresh (a new DatabaseSync instance, not
    // the same handle) — proves the data genuinely persisted to disk,
    // not just to an in-process cache the first instance happened to
    // keep alive.
    const reopened = openCacheDb(dbPath)
    const row = queryCoverById(reopened, 'real-file-id')
    expect(row?.nameOfCover).toBe('Real File Cover')
    reopened.close()
  })
})

describe('localCache', () => {
  let db: DatabaseSync

  beforeEach(() => {
    db = openCacheDb(':memory:')
  })

  it('replaceCache stores rows and metadata; getLastSyncedAt/getFacets read them back', () => {
    expect(getLastSyncedAt(db)).toBeNull()
    expect(getFacets(db)).toBeNull()

    replaceCache(db, [makeRow({})], { productCategories: [{ value: 'Textile', count: 1 }] })

    expect(getLastSyncedAt(db)).not.toBeNull()
    expect(getFacets(db)).toEqual({ productCategories: [{ value: 'Textile', count: 1 }] })
  })

  it('replaceCache genuinely replaces, not appends', () => {
    replaceCache(db, [makeRow({ id: 'old' })], null)
    replaceCache(db, [makeRow({ id: 'new' })], null)

    const { totalCount } = queryPage(db, { sort: 'newest', page: 1, pageSize: 10 })
    expect(totalCount).toBe(1)
    expect(queryCoverById(db, 'old')).toBeNull()
    expect(queryCoverById(db, 'new')).not.toBeNull()
  })

  describe('filtering', () => {
    beforeEach(() => {
      replaceCache(
        db,
        [
          makeRow({
            id: 'a',
            postalCircleId: 'circle-1',
            productCategory: 'Textile',
            dateOfIssue: '2020-06-01'
          }),
          makeRow({
            id: 'b',
            postalCircleId: 'circle-2',
            productCategory: 'Handicraft',
            dateOfIssue: '2021-06-01'
          }),
          makeRow({
            id: 'c',
            postalCircleId: 'circle-1',
            productCategory: 'Handicraft',
            dateOfIssue: '2020-06-01'
          })
        ],
        null
      )
    })

    it('filters by postalCircleIds', () => {
      expect(queryCount(db, { postalCircleIds: ['circle-1'] })).toBe(2)
    })

    it('filters by productCategories', () => {
      expect(queryCount(db, { productCategories: ['Handicraft'] })).toBe(2)
    })

    it('filters by years using the same date-range-group shape as the online query', () => {
      expect(queryCount(db, { years: [2020] })).toBe(2)
      expect(queryCount(db, { years: [2020, 2021] })).toBe(3)
    })

    it('combines filters as AND, matching applyCatalogueFilters', () => {
      expect(
        queryCount(db, { postalCircleIds: ['circle-1'], productCategories: ['Textile'] })
      ).toBe(1)
    })

    it('queryOrderedIds respects the same filters', () => {
      expect(queryOrderedIds(db, { postalCircleIds: ['circle-1'], sort: 'newest' }).sort()).toEqual(
        ['a', 'c']
      )
    })
  })

  describe('search', () => {
    beforeEach(() => {
      replaceCache(
        db,
        [
          makeRow({ id: 'a', nameOfCover: 'Silk Wall Hanging', overallDescription: null }),
          makeRow({
            id: 'b',
            nameOfCover: 'Cotton Bag',
            overallDescription: 'famous for its silk'
          }),
          makeRow({ id: 'c', nameOfCover: 'Wool Scarf', overallDescription: null })
        ],
        null
      )
    })

    it('matches case-insensitively across name and description, same fields as the online search', () => {
      expect(queryCount(db, { searchTerm: 'SILK' })).toBe(2)
    })

    it('strips the same characters sanitizeSearchTerm strips online, so a stray ")" does not break the query', () => {
      expect(() => queryCount(db, { searchTerm: 'silk)' })).not.toThrow()
    })
  })

  describe('sorting', () => {
    beforeEach(() => {
      replaceCache(
        db,
        [
          makeRow({ id: 'a', nameOfCover: 'Banana', verifiedAt: '2023-01-01T00:00:00.000Z' }),
          makeRow({ id: 'b', nameOfCover: null, verifiedAt: '2023-03-01T00:00:00.000Z' }),
          makeRow({ id: 'c', nameOfCover: 'Apple', verifiedAt: '2023-02-01T00:00:00.000Z' })
        ],
        null
      )
    })

    it('alphabetical sort puts a null name LAST, matching the online nullsFirst:false behavior', () => {
      const { covers } = queryPage(db, { sort: 'alphabetical', page: 1, pageSize: 10 })
      expect(covers.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    })

    it('newest sort orders by verifiedAt descending', () => {
      const { covers } = queryPage(db, { sort: 'newest', page: 1, pageSize: 10 })
      expect(covers.map((c) => c.id)).toEqual(['b', 'c', 'a'])
    })
  })

  it('queryPage paginates correctly', () => {
    replaceCache(
      db,
      Array.from({ length: 5 }, (_, i) => makeRow({ id: `id-${i}`, nameOfCover: `Cover ${i}` })),
      null
    )
    const page1 = queryPage(db, { sort: 'alphabetical', page: 1, pageSize: 2 })
    const page2 = queryPage(db, { sort: 'alphabetical', page: 2, pageSize: 2 })
    expect(page1.covers).toHaveLength(2)
    expect(page2.covers).toHaveLength(2)
    expect(page1.totalCount).toBe(5)
    expect(page1.covers[0].id).not.toBe(page2.covers[0].id)
  })

  it('queryCoversByIds preserves the requested id order, not table order', () => {
    replaceCache(db, [makeRow({ id: 'a' }), makeRow({ id: 'b' }), makeRow({ id: 'c' })], null)
    const result = queryCoversByIds(db, ['c', 'a'])
    expect(result.map((c) => c.id)).toEqual(['c', 'a'])
  })

  it('queryCoverById returns null, not a crash, for a missing id', () => {
    expect(queryCoverById(db, 'nonexistent')).toBeNull()
  })
})
