import '../styles/globals.css'
import { AuthProvider } from '../lib/AuthContext'

function Application({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}

export default Application
