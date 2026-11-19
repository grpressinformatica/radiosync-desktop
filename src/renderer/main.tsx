import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { initializeTheme } from './components/Layout'
import App from './App'
import './globals.css'

initializeTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    // Local SQLite operations must run even when Chromium reports no connection.
    queries: { staleTime: 30_000, retry: 1, networkMode: 'always' },
    mutations: { networkMode: 'always' }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)