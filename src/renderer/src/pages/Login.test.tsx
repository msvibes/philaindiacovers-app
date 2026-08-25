import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from './Login'
import { supabase } from '../lib/supabaseClient'
import { fetchCurrentRole } from '../lib/currentRole'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resend: vi.fn()
    }
  }
}))

vi.mock('../lib/currentRole', () => ({
  fetchCurrentRole: vi.fn()
}))

const mockedSignIn = vi.mocked(supabase.auth.signInWithPassword)
const mockedSignOut = vi.mocked(supabase.auth.signOut)
const mockedResend = vi.mocked(supabase.auth.resend)
const mockedFetchRole = vi.mocked(fetchCurrentRole)

beforeEach(() => {
  mockedSignIn.mockReset()
  mockedSignOut.mockReset()
  mockedResend.mockReset()
  mockedFetchRole.mockReset()
})

async function signIn(email = 'collector@example.test', password = 'a-password'): Promise<void> {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('Login — sign-in', () => {
  it('signs in and lets a real Collector session stand', async () => {
    mockedSignIn.mockResolvedValue({ data: {}, error: null } as never)
    mockedFetchRole.mockResolvedValue('collector')
    render(<Login />)

    await signIn()

    await waitFor(() =>
      expect(mockedSignIn).toHaveBeenCalledExactlyOnceWith({
        email: 'collector@example.test',
        password: 'a-password'
      })
    )
    expect(mockedSignOut).not.toHaveBeenCalled()
  })

  it('signs back out and shows a clear message for a non-Collector role', async () => {
    mockedSignIn.mockResolvedValue({ data: {}, error: null } as never)
    mockedFetchRole.mockResolvedValue('verifier')
    render(<Login />)

    await signIn()

    await waitFor(() =>
      expect(screen.getByText(/isn't set up as a Collector/i)).toBeInTheDocument()
    )
    expect(mockedSignOut).toHaveBeenCalledOnce()
  })

  it('shows a courteous generic message for a genuine wrong-password/invalid-credentials failure', async () => {
    mockedSignIn.mockResolvedValue({
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' }
    } as never)
    render(<Login />)

    await signIn()

    await waitFor(() => expect(screen.getByText(/didn't work — double-check/i)).toBeInTheDocument())
    expect(screen.queryByText(/hasn't been verified/i)).not.toBeInTheDocument()
  })

  // FR-27/US-02 — the one failure with a real distinguishable error code
  // (confirmed live against the real hosted project, not assumed), so it
  // gets its own tailored state with a working resend action instead of
  // the generic message.
  it('recognizes the specific email_not_confirmed error and offers a working resend action', async () => {
    mockedSignIn.mockResolvedValue({
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' }
    } as never)
    mockedResend.mockResolvedValue({ error: null } as never)
    render(<Login />)

    await signIn('unconfirmed@example.test')

    await waitFor(() => expect(screen.getByText(/hasn't been verified/i)).toBeInTheDocument())
    expect(screen.queryByText(/didn't work — double-check/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }))

    expect(mockedResend).toHaveBeenCalledExactlyOnceWith({
      type: 'signup',
      email: 'unconfirmed@example.test'
    })
    await waitFor(() =>
      expect(screen.getByText(/sent — check your email again/i)).toBeInTheDocument()
    )
  })
})

describe('Login — mode toggle', () => {
  it('switches to the signup form and back', async () => {
    render(<Login />)

    await userEvent.click(screen.getByRole('button', { name: /don't have an account/i }))
    expect(screen.getByRole('heading', { name: /join the catalogue/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /already have an account/i }))
    expect(screen.getByRole('heading', { name: /welcome back, collector/i })).toBeInTheDocument()
  })
})
