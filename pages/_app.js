import '../styles/globals.css'
import { AuthProvider } from '../lib/AuthContext'
import Footer from '../components/Footer'
import { useRouter } from 'next/router'

function Application({ Component, pageProps }) {
  const router = useRouter()
  const isLoginPage = router.pathname === '/login'
  const isSplashPage = router.pathname === '/splash'
  const isManageTournamentPage = router.pathname === '/manage-tournament'
  
  return (
    <AuthProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Component {...pageProps} />
        {!isLoginPage && !isSplashPage && !isManageTournamentPage && <Footer />}
      </div>
    </AuthProvider>
  )
}

export default Application
