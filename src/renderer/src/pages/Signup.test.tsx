import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Signup from './Signup'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signUp: vi.fn() } }
}))

const mockedSignUp = vi.mocked(supabase.auth.signUp)

beforeEach(() => {
  mockedSignUp.mockReset()
})

async function fillValidForm(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Email'), 'new@example.test')
  await userEvent.type(screen.getByLabelText('Password'), 'a-real-password')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'a-real-password')
  await userEvent.click(screen.getByRole('checkbox'))
}

describe('Signup', () => {
  it('submit is disabled until the disclaimer checkbox is checked — FR-23/FR-57', async () => {
    render(<Signup onSwitchToSignIn={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.test')
    await userEvent.type(screen.getByLabelText('Password'), 'a-real-password')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-real-password')

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
  })

  it('shows a clear message and blocks submit when the passwords do not match', async () => {
    render(<Signup onSwitchToSignIn={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.test')
    await userEvent.type(screen.getByLabelText('Password'), 'a-real-password')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different-password')
    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText(/don't match yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('calls signUp with the real email/password and shows the check-your-email state on success', async () => {
    mockedSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null } as never)
    render(<Signup onSwitchToSignIn={() => {}} />)
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(mockedSignUp).toHaveBeenCalledExactlyOnceWith({
      email: 'new@example.test',
      password: 'a-real-password'
    })
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
  })

  it("shows the same check-your-email state even when the account already existed — matches signUp()'s own anti-enumeration shape, not distinguished client-side", async () => {
    mockedSignUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null
    } as never)
    render(<Signup onSwitchToSignIn={() => {}} />)
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
  })

  it('shows the real Supabase error message on a genuine signup failure — e.g. a weak password', async () => {
    mockedSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 6 characters.' }
    } as never)
    render(<Signup onSwitchToSignIn={() => {}} />)
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() =>
      expect(screen.getByText('Password should be at least 6 characters.')).toBeInTheDocument()
    )
  })

  it('opens and closes the linked Disclaimer view from the checkbox label', async () => {
    render(<Signup onSwitchToSignIn={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /disclaimer/i }))

    expect(screen.getByText(/data accuracy & independence disclaimer/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/data accuracy & independence disclaimer/i)).not.toBeInTheDocument()
  })

  // T-33: Escape now closes every modal in the app, including this
  // already-shipped one — the new ShortcutsModal's own help text claims
  // "Esc closes any dialog," so this needs to actually be true here too.
  it('closes the Disclaimer view on Escape', async () => {
    render(<Signup onSwitchToSignIn={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /disclaimer/i }))
    expect(screen.getByText(/data accuracy & independence disclaimer/i)).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText(/data accuracy & independence disclaimer/i)).not.toBeInTheDocument()
  })

  it('calls onSwitchToSignIn when "Already have an account?" is clicked', async () => {
    const onSwitchToSignIn = vi.fn()
    render(<Signup onSwitchToSignIn={onSwitchToSignIn} />)

    await userEvent.click(screen.getByRole('button', { name: /already have an account/i }))
    expect(onSwitchToSignIn).toHaveBeenCalledOnce()
  })
})
