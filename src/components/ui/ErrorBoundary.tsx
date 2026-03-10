import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Matcha] ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <h2 className="text-xl font-black text-white/80 mb-2">
              {this.props.fallbackMessage ?? 'Something went wrong'}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="secondary" size="sm">
                Try Again
              </Button>
              <Button onClick={this.handleHome} variant="ghost" size="sm">
                Back to Menu
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
