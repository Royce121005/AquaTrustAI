import React from 'react'
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronRight } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    const route = this.props.routeName || (typeof window !== 'undefined' ? window.location.pathname : 'unknown')
    console.error(`[AquaTrust ErrorBoundary] Render error caught on route [${route}]:`, error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error, errorInfo, route)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback
      }

      const route = this.props.routeName || (typeof window !== 'undefined' ? window.location.pathname : 'unknown')
      const errorMessage = this.state.error?.message || 'Unknown runtime error'

      return (
        <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 my-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-rose-50 p-2.5 dark:bg-rose-950/50">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                SCADA Workspace Render Guard
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                A rendering exception was intercepted on route{' '}
                <span className="font-mono font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-xs">
                  {route}
                </span>
                . The frame caught the exception to prevent a plant floor white screen.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry View
                </button>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Home className="h-3.5 w-3.5" />
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Hard Reload
                </button>
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 ml-auto"
                >
                  {this.state.showDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span>Technical Diagnostics</span>
                </button>
              </div>

              {this.state.showDetails && (
                <div className="mt-4 rounded-lg bg-slate-950 p-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-64 overflow-y-auto">
                  <div className="font-bold text-rose-400 mb-1">{errorMessage}</div>
                  {this.state.error?.stack && (
                    <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">{this.state.error.stack}</pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                      Component Stack:
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
