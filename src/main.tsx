import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Qualquer erro fora das telas também aparece na tela (nunca uma página preta sem explicação).
function mostrarErro(msg: string) {
  const el = document.createElement('pre')
  el.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-height:40vh;overflow:auto;white-space:pre-wrap;' +
    'background:#1a0b10;color:#fecdd3;border:1px solid #fb7185;border-radius:12px;padding:12px;font:12px/1.5 monospace'
  el.textContent = 'Erro (mande um print para o Claude):\n' + msg
  document.body.appendChild(el)
}
window.addEventListener('error', (e) => mostrarErro(`${e.message}\n${e.error?.stack ?? ''}`))
window.addEventListener('unhandledrejection', (e) => mostrarErro(String(e.reason?.stack ?? e.reason)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-full">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </div>
  </StrictMode>,
)
