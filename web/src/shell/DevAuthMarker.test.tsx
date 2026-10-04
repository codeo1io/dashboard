import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it} from 'vitest'
import {DevAuthMarker} from './DevAuthMarker.tsx'

describe('DevAuthMarker (rm-642)', () => {
  let metaTag: HTMLMetaElement | null = null

  const addMetaTag = () => {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'dev-auto-login')
    metaTag.setAttribute('content', 'true')
    document.head.appendChild(metaTag)
  }

  const removeMetaTag = () => {
    if (metaTag && metaTag.parentNode) {
      metaTag.parentNode.removeChild(metaTag)
    }
    metaTag = null
  }

  beforeEach(() => {
    removeMetaTag()
  })

  it('renders a persistent marker when the server injected the dev-auto-login meta', () => {
    addMetaTag()
    render(<DevAuthMarker />)
    expect(screen.getByTestId('dev-auth-marker')).toBeDefined()
    expect(screen.getByLabelText('dev auto-login active')).toBeDefined()
  })

  it('renders nothing when the meta is absent (production boots)', () => {
    render(<DevAuthMarker />)
    expect(screen.queryByTestId('dev-auth-marker')).toBeNull()
  })

  it('renders nothing when the meta is present but not "true"', () => {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'dev-auto-login')
    metaTag.setAttribute('content', 'false')
    document.head.appendChild(metaTag)
    render(<DevAuthMarker />)
    expect(screen.queryByTestId('dev-auth-marker')).toBeNull()
  })
})
