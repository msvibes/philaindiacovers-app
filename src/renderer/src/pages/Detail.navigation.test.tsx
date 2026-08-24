import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Detail from './Detail'
import { downloadCoverImageUrl, fetchVerifiedCoverById, type CoverDetail } from '../lib/covers'

vi.mock('../lib/covers', async () => {
  const actual = await vi.importActual<typeof import('../lib/covers')>('../lib/covers')
  return {
    ...actual,
    fetchVerifiedCoverById: vi.fn(),
    downloadCoverImageUrl: vi.fn()
  }
})

const mockedFetch = vi.mocked(fetchVerifiedCoverById)
const mockedDownload = vi.mocked(downloadCoverImageUrl)

const fullCover: CoverDetail = {
  id: 'cover-2',
  giItemName: 'Test GI Name',
  productCategory: null,
  dateOfIssue: null,
  imageFile: 'x.jpg',
  postalCircleId: null,
  postalCircleName: null,
  nameOfCover: 'Test Cover',
  giRegistrationNumber: null,
  cancellationDescription: null,
  cachetDescription: null,
  overallDescription: null,
  placeOfIssue: null
}

beforeEach(() => {
  mockedFetch.mockReset()
  mockedDownload.mockReset()
  mockedFetch.mockResolvedValue(fullCover)
  mockedDownload.mockResolvedValue('blob:mock-url')
})

// FR-12: prev/next respecting the active filtered set. App.tsx computes
// previousCoverId/nextCoverId/position from the real ordered-id list — this
// file tests Detail's own rendering/interaction contract against those
// props directly, the same split Catalogue.*.test.tsx already uses between
// "the query gets built right" and "the component renders/behaves right".
describe('Detail navigation (FR-12)', () => {
  it('renders no nav row at all when position is null — e.g. the ordered-id list has not loaded yet', async () => {
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={vi.fn()}
        previousCoverId={null}
        nextCoverId={null}
        position={null}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText('Test Cover')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows the position counter and disables Previous at the start of the list', async () => {
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={vi.fn()}
        previousCoverId={null}
        nextCoverId="cover-3"
        position={{ index: 0, total: 5 }}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText('1 of 5')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('disables Next at the end of the list', async () => {
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={vi.fn()}
        previousCoverId="cover-1"
        nextCoverId={null}
        position={{ index: 4, total: 5 }}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText('5 of 5')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })

  it('clicking Next calls onSelectCover with the real next id', async () => {
    const onSelectCover = vi.fn()
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={onSelectCover}
        previousCoverId="cover-1"
        nextCoverId="cover-3"
        position={{ index: 1, total: 5 }}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-3')
  })

  it('the ArrowRight/ArrowLeft keys navigate the same way the buttons do', async () => {
    const onSelectCover = vi.fn()
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={onSelectCover}
        previousCoverId="cover-1"
        nextCoverId="cover-3"
        position={{ index: 1, total: 5 }}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText('2 of 5')).toBeInTheDocument())

    await userEvent.keyboard('{ArrowRight}')
    expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-3')

    await userEvent.keyboard('{ArrowLeft}')
    expect(onSelectCover).toHaveBeenCalledWith('cover-1')
    expect(onSelectCover).toHaveBeenCalledTimes(2)
  })

  it('arrow keys do nothing at a bound where the corresponding id is null', async () => {
    const onSelectCover = vi.fn()
    render(
      <Detail
        coverId="cover-2"
        onBack={() => {}}
        onSelectCover={onSelectCover}
        previousCoverId={null}
        nextCoverId={null}
        position={{ index: 0, total: 1 }}
        onFilterByGiTag={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText('1 of 1')).toBeInTheDocument())

    await userEvent.keyboard('{ArrowRight}{ArrowLeft}')
    expect(onSelectCover).not.toHaveBeenCalled()
  })
})
