import { Component } from 'react'

// Without this, one rendering bug anywhere shows a blank white page. React only supports
// error boundaries as class components.
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('UI crashed:', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl">Something broke</h1>
        <p className="mt-2 text-sm text-ink-soft">The page hit an unexpected problem. Reloading usually fixes it.</p>
        <button onClick={() => window.location.assign('/')}
          className="mt-5 rounded-xl bg-bios px-4 py-2 text-sm font-semibold text-white hover:bg-bios-deep">Back to the store</button>
      </div>
    )
  }
}
