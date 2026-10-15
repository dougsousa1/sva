import { Component, type ReactNode } from 'react'

/** Mostra o erro na tela em vez de deixar a página em branco. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }
  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }
  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="panel mx-auto max-w-xl p-6">
        <h2 className="font-display text-lg font-semibold text-rose">Esta tela encontrou um erro</h2>
        <p className="mt-2 text-sm text-ink-2">Tire um print desta mensagem e mande para o Claude:</p>
        <pre className="num mt-3 overflow-x-auto rounded-lg border border-line bg-bg/70 p-3 text-xs whitespace-pre-wrap text-ink-2">
          {this.state.erro.message}
          {'\n'}
          {(this.state.erro.stack ?? '').split('\n').slice(1, 4).join('\n')}
        </pre>
        <button onClick={() => this.setState({ erro: null })} className="mt-4 rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink">
          Tentar de novo
        </button>
      </div>
    )
  }
}
