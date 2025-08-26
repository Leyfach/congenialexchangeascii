import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TradingPage from './pages/TradingPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import Login from './components/auth/Login.jsx'
import Register from './components/auth/Register.jsx'
import Header from './components/common/Header.jsx'
import Navbar from './components/common/Navbar.jsx'
import MarketTable from './components/markets/MarketTable.jsx'
import OrderBook from './components/trading/OrderBook.jsx'
import { authService } from './services/auth.js'
import MatrixBackground from './components/common/MatrixBackground.jsx'

function ProtectedRoute({ children }) {
  return authService.isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="min-h-screen font-mono bg-black text-neon-matrix relative">
      <MatrixBackground />
      <div className="relative z-10">
        <Header />
        <Navbar />
        <main className="px-4 md:px-8 lg:px-12 py-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/markets" element={<ProtectedRoute><div className="space-y-6"><h1 className="ascii-title">MARKETS</h1><div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className="xl:col-span-2"><MarketTable /></div><div className=""><OrderBook compact /></div></div></div></ProtectedRoute>} />
            <Route path="/trading" element={<ProtectedRoute><TradingPage /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <div className="scanline" />
    </div>
  )
}