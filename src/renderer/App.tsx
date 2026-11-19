import { Routes, Route, Navigate } from 'react-router-dom'
import SobrePage from './pages/SobrePage'
import DashboardPage from './pages/DashboardPage'
import Layout from './components/Layout'
import OuvintesPage from './pages/OuvintesPage'
import PromocoesPage from './pages/PromocoesPage'
import ParticipacoesPage from './pages/ParticipacoesPage'
import SorteioPage from './pages/SorteioPage'

import MuralPage from './pages/MuralPage'
import HistoricoPage from './pages/HistoricoPage'

export default function App() {
 return (
 <Layout>
 <Routes>
 <Route path="/" element={<Navigate to="/dashboard" replace />} />
 <Route path="/dashboard" element={<DashboardPage />} />
 <Route path="/sobre" element={<SobrePage />} />
 <Route path="/ouvintes" element={<OuvintesPage />} />
 <Route path="/promocoes" element={<PromocoesPage />} />
 <Route path="/participacoes" element={<ParticipacoesPage />} />
 <Route path="/mural" element={<MuralPage />} />
 <Route path="/historico" element={<HistoricoPage />} />
 <Route path="/sorteio" element={<SorteioPage />} />
 </Routes>
 </Layout>
 )
}