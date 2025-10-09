import '../styles/globals.css'
import { AuthProvider } from '../lib/AuthContext'
import Footer from '../components/Footer'

function Application({ Component, pageProps }) {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Component {...pageProps} />
        <Footer />
      </div>
    </AuthProvider>
  )
}

export default Application
