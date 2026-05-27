import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './src/App'
import './src/styles.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Renderer Error]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: '#e7eef9', fontFamily: 'sans-serif' }}>
          <h2>Renderer Error</h2>
          <pre style={{ background: '#0d131d', padding: 10, borderRadius: 8 }}>{this.state.error}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

console.log('[main.tsx] Renderer starting...')

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
