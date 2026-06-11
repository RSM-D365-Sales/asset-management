import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import WorkOrders from './pages/WorkOrders'
import WorkOrderDetail from './pages/WorkOrderDetail'
import WorkRequests from './pages/WorkRequests'
import Insights from './pages/Insights'
import InsightTableDetail from './pages/InsightTableDetail'
import Drydock from './pages/Drydock'
import Analytics from './pages/Analytics'
import { initConnectivity } from './data/sync'

export default function App() {
  useEffect(() => {
    initConnectivity()
  }, [])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/requests" element={<WorkRequests />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:id" element={<InsightTableDetail />} />
        <Route path="/drydock" element={<Drydock />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Layout>
  )
}
