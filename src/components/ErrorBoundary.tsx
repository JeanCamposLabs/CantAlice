import { Component, type ReactNode } from 'react'

/**
 * Catches render errors in a page so one bad screen can't blank the whole app.
 * Resets automatically when `resetKey` changes (e.g. the user navigates), so a
 * crash on one tab clears the moment they switch to another.
 */
export class ErrorBoundary extends Component<
  { resetKey: unknown; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { resetKey: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">😵‍💫</span>
          <h2 className="font-display text-2xl">Algo deu errado nesta tela</h2>
          <p className="text-sm text-mist/65">
            Tente outra aba ou recarregue a página. Seu progresso está salvo.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
