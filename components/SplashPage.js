import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './SplashPage.module.css'

export default function SplashPage() {
  const router = useRouter()
  const { user } = useAuth()

  const handleGetStarted = () => {
    if (user) {
      router.push('/')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className={styles.splashContainer}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.brandText}>BOXD</div>
            <h1 className={styles.heroTitle}>
              ESports
              <br />
              <span className={styles.heroTitleAccent}>Events</span>
              <br />
              start here.
            </h1>
            <p className={styles.heroSubtitle}>
              Host tournaments, locals, and open play events. 
              Connect in-person and build your social gaming community.
            </p>
            <button 
              onClick={handleGetStarted}
              className={styles.ctaButton}
            >
              Create Your First Event
            </button>
          </div>
          <div className={styles.heroVideo}>
            <video 
              className={styles.videoClip}
              autoPlay 
              loop 
              muted 
              playsInline
            >
              <source src="/clip.webm" type="video/webm" />
            </video>
          </div>
        </div>
      </div>
    </div>
  )
}
