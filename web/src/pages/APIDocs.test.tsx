import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import APIDocs from './APIDocs'
import { api } from '@/lib/api'
import { render } from '@/test/test-utils'

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    openapi: vi.fn(),
  },
}))

describe('APIDocs', () => {
  const mockEndpoints = [
    'GET /api/dns/:domain',
    'GET /api/mx/:domain',
    'GET /api/spf/:domain',
    'POST /api/batch',
    'GET /api/health',
    'GET /api/metrics',
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.openapi).mockResolvedValue({ data: { endpoints: mockEndpoints } } as any)
  })

  it('should render the page with title', () => {
    const { getByText } = render(<APIDocs />)
    expect(getByText('API Documentation')).toBeInTheDocument()
  })

  it('should render filter input', () => {
    const { getByPlaceholderText } = render(<APIDocs />)
    expect(getByPlaceholderText(/filter endpoints/i)).toBeInTheDocument()
  })

  it('should render health cards', () => {
    const { getByText } = render(<APIDocs />)
    expect(getByText('API Status')).toBeInTheDocument()
    expect(getByText('Live Metrics')).toBeInTheDocument()
    expect(getByText('OpenAPI Spec')).toBeInTheDocument()
  })

  it('should load and display endpoints', async () => {
    const { getByText } = render(<APIDocs />)
    
    await waitFor(() => {
      expect(getByText('dns')).toBeInTheDocument()
    })
  })
})
