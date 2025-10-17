import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import NavBar from '../../components/NavBar'
import styles from './Login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email for the confirmation link!')
        }
      } else {
        const { data, error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          router.push('/')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error } = await signInWithGoogle()
      if (error) {
        setError(error.message)
      }
      // Google OAuth will redirect, so no need to handle success case
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1 }}>
      <NavBar hideMiddleNav={true} />
      <div className={styles.loginContainer}>
        <div className={styles.imageBackground}>
          <div className={styles.imageOverlay}></div>
        </div>
      
      <div className={styles.loginCard}>
        <div className={styles.iconContainer}>
          <div className={styles.doorIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-4h18V3H3v2z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        
        <h1 className={styles.title}>Welcome to BOXD</h1>
        <p className={styles.subtitle}>Please sign in or sign up below</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@email.com"
              required
              disabled={loading}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          
          {message && (
            <div className={styles.message}>
              {message}
            </div>
          )}
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Continue with Email')}
          </button>
        </form>
        
        <div className={styles.divider}>
          <span className={styles.dividerText}>or</span>
        </div>
        
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className={styles.googleButton}
          disabled={loading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        
        <div className={styles.toggleContainer}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setMessage('')
            }}
            className={styles.toggleButton}
            disabled={loading}
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
