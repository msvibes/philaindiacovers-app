import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPassword from './ForgotPassword'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } }
}))

const mockedResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail)

beforeEach(() => {
  mockedResetPasswordForEmail.mockReset()
})

describe('ForgotPassword', () => {
  it('calls resetPasswordForEmail with the entered email and the real GitHub Pages redirect URL, and shows the check-your-email state on success', async () => {
    mockedResetPasswordForEmail.mockResolvedValue({ data: {}, error: null } as never)
    render(<ForgotPassword onSwitchToSignIn={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email'), 'collector@example.test')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(mockedResetPasswordForEmail).toHaveBeenCalledExactlyOnceWith('collector@example.test', {
      redirectTo: 'https://msvibes.github.io/philaindiacovers-app/'
    })
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
  })

  it("shows the same check-your-email state regardless of whether the account exists — matches resetPasswordForEmail()'s own anti-enumeration shape, not distinguished client-side", async () => {
    mockedResetPasswordForEmail.mockResolvedValue({ data: {}, error: null } as never)
    render(<ForgotPassword onSwitchToSignIn={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email'), 'no-such-account@example.test')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
  })

  it('shows the real Supabase error message on a genuine failure', async () => {
    mockedResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Email rate limit exceeded' }
    } as never)
    render(<ForgotPassword onSwitchToSignIn={() => {}} />)

    await userEvent.type(screen.getByLabelText('Email'), 'collector@example.test')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => expect(screen.getByText('Email rate limit exceeded')).toBeInTheDocument())
  })

  it('calls onSwitchToSignIn when "Back to sign in" is clicked', async () => {
    const onSwitchToSignIn = vi.fn()
    render(<ForgotPassword onSwitchToSignIn={onSwitchToSignIn} />)

    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(onSwitchToSignIn).toHaveBeenCalledOnce()
  })
})
