import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'
import { TooltipProvider } from '@/components/ui/tooltip'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={200}>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
)
