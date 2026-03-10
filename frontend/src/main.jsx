import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Checkout from './Checkout.jsx'

const path = window.location.pathname

const goHome = () => window.location.href = '/'

let element
if (path.startsWith('/admin')) {
  element = <Admin />
} else if (path.startsWith('/checkout')) {
  element = <Checkout onBack={goHome} onSuccess={goHome} />
} else {
  element = <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>{element}</StrictMode>
)
