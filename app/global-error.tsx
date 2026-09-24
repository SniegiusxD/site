'use client'

import { useEffect } from 'react'
import { reportError } from '@/components/error-reporter'

/**
 * Last resort: the root layout itself failed, so nothing of the site's shell or
 * styles can be assumed. Plain markup with inline colours, and the error goes
 * to the log like any other.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('boundary', error, error.digest)
  }, [error])

  return (
    <html lang="lt">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#06231A', color: '#EAF6EE', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: '32rem', padding: '2rem 1.25rem' }}>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Kažkas nepavyko</h1>
          <p style={{ color: '#9DB8A8', lineHeight: 1.5 }}>
            Svetainės įkelti nepavyko. Pabandyk dar kartą po kelių sekundžių.
            {error.digest && <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem' }}>Klaidos kodas: {error.digest}</span>}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: 0, background: '#EAF6EE', color: '#06231A', fontWeight: 600, cursor: 'pointer' }}
          >
            Bandyti dar kartą
          </button>
        </main>
      </body>
    </html>
  )
}
