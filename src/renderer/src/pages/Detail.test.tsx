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
  id: 'cover-1',
  giItemName: 'Adamchini Chawal (Rice)',
  productCategory: null,
  dateOfIssue: '2023-05-19',
  imageFile: 'some/path.jpg',
  postalCircleId: 'circle-1',
  postalCircleName: 'Uttar Pradesh',
  nameOfCover: 'Adamchini Chawal',
  giRegistrationNumber: null,
  cancellationDescription: 'Pictorial: Depicts grains and husks.',
  cachetDescription: 'Golden ripe paddy stalks in the field.',
  overallDescription: 'Celebrates the aromatic rice of Chandauli district.',
  placeOfIssue: 'Varanasi'
}

beforeEach(() => {
  mockedFetch.mockReset()
  mockedDownload.mockReset()
})

describe('Detail', () => {
  it('shows a clean, simple loading state', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}))
    render(<Detail coverId="cover-1" onBack={() => {}} />)
    expect(screen.getByText(/loading this cover/i)).toBeInTheDocument()
  })

  it('shows a courteous not-found state — distinct from a network error — when the cover genuinely does not exist (or is no longer verified)', async () => {
    mockedFetch.mockResolvedValue(null)
    render(<Detail coverId="cover-1" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText(/couldn't find that cover/i)).toBeInTheDocument())
    expect(screen.queryByText(/didn't go to plan/i)).not.toBeInTheDocument()
  })

  it('shows a courteous error state with a working retry action on a genuine failure', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network error'))
    mockedFetch.mockResolvedValueOnce(fullCover)
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => expect(screen.getByText('Adamchini Chawal')).toBeInTheDocument())
    expect(mockedFetch).toHaveBeenCalledTimes(2)
  })

  it('calls onBack when the back button is clicked', async () => {
    mockedFetch.mockReturnValue(new Promise(() => {}))
    const onBack = vi.fn()
    render(<Detail coverId="cover-1" onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back to catalogue/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('renders every real field value for the full record, not a subset', async () => {
    mockedFetch.mockResolvedValue(fullCover)
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('Adamchini Chawal')).toBeInTheDocument())
    expect(screen.getByText('Adamchini Chawal (Rice)')).toBeInTheDocument()
    expect(screen.getByText('19 May 2023')).toBeInTheDocument()
    expect(screen.getByText('Pictorial: Depicts grains and husks.')).toBeInTheDocument()
    expect(screen.getByText('Golden ripe paddy stalks in the field.')).toBeInTheDocument()
    expect(
      screen.getByText('Celebrates the aromatic rice of Chandauli district.')
    ).toBeInTheDocument()
    expect(screen.getByText('Varanasi')).toBeInTheDocument()
  })

  it('shows courteous fallback copy for a null Product Category — T-14, matching Catalogue\'s existing copy for the same field', async () => {
    mockedFetch.mockResolvedValue(fullCover) // productCategory: null
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() =>
      expect(screen.getByText('Category not recorded yet')).toBeInTheDocument()
    )
  })

  it('shows courteous fallback copy for a null Date of Issue, via the same formatDateOfIssue() helper Catalogue already uses', async () => {
    mockedFetch.mockResolvedValue({ ...fullCover, dateOfIssue: null })
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText('Date not recorded yet')).toBeInTheDocument())
  })

  it('shows courteous fallback copy for a null field — gi_registration_number, the shape that is real and live today', async () => {
    mockedFetch.mockResolvedValue(fullCover) // giRegistrationNumber: null
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() =>
      expect(screen.getByText('Registration number not recorded yet')).toBeInTheDocument()
    )
  })

  it('shows courteous fallback copy for an empty-string field — the realistic "missing" shape for these five fields via the real import path', async () => {
    mockedFetch.mockResolvedValue({ ...fullCover, placeOfIssue: '' })
    mockedDownload.mockResolvedValue('blob:mock-url')
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() =>
      expect(screen.getByText('Place of issue not recorded yet')).toBeInTheDocument()
    )
  })

  it('shows a courteous fallback, not a stuck spinner, when the image download genuinely fails', async () => {
    mockedFetch.mockResolvedValue(fullCover)
    mockedDownload.mockRejectedValue(new Error('storage error'))
    render(<Detail coverId="cover-1" onBack={() => {}} />)

    await waitFor(() => expect(screen.getByText(/couldn't load this photo/i)).toBeInTheDocument())
  })
})
