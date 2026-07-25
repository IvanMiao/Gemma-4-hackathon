import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import Journey from './pages/Journey'
import Landing from './pages/Landing'
import Observability from './pages/Observability'
import './styles.css'
import './landing.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/observability" element={<Observability />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
