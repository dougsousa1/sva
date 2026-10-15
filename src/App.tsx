import type { ReactNode } from 'react'
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AppProvider } from './lib/app-context'
import Aprendizados from './pages/Aprendizados'
import Campanhas from './pages/Campanhas'
import Chips from './pages/Chips'
import Config from './pages/Config'
import Criativos from './pages/Criativos'
import Dashboard from './pages/Dashboard'
import Despesas from './pages/Despesas'
import Ofertas from './pages/Ofertas'
import Vendas from './pages/Vendas'

// Dentro de um iframe (ex.: prévia no app do Claude) a URL não pode mudar, então a navegação fica em memória.
const embutido = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()
function Router({ children }: { children: ReactNode }) {
  return embutido ? <MemoryRouter>{children}</MemoryRouter> : <HashRouter>{children}</HashRouter>
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ofertas" element={<Ofertas />} />
            <Route path="criativos" element={<Criativos />} />
            <Route path="campanhas" element={<Campanhas />} />
            <Route path="chips" element={<Chips />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="despesas" element={<Despesas />} />
            <Route path="aprendizados" element={<Aprendizados />} />
            <Route path="config" element={<Config />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  )
}
