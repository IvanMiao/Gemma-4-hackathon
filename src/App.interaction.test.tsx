// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('digital twin component interaction', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lets a keyboard-accessible X3 selection drive the inspection flow', async () => {
    render(<App />)

    await screen.findByRole('heading', {
      name: 'Switch command completed; position indication not established',
    })

    fireEvent.click(screen.getByRole('button', { name: /X3 connector/i }))

    expect(
      screen.getByRole('complementary', { name: 'X3-4 indication connector inspection details' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Circuit continuity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run diagnosis to unlock inspection' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Start local diagnosis' }))

    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Run isolated X3 inspection' })).toBeEnabled(),
      { timeout: 3_000 },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Run isolated X3 inspection' }))

    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Inspection captured in E-201' })).toBeDisabled(),
      { timeout: 5_000 },
    )
    expect(screen.getAllByText('FAULT ISOLATED').length).toBeGreaterThan(0)
  }, 8_000)
})
