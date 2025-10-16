import { useRouter } from 'next/router'
import styles from './Splash.module.css'

export default function Splash({ onTabChange }) {
  const router = useRouter()

  const handleCreateLocal = () => {
    if (onTabChange) {
      onTabChange('createEvent')
    } else {
      router.push('/?tab=createEvent')
    }
  }

  return (
    <div className={styles.splashContainer}>
      <video 
        className={styles.backgroundVideo}
        autoPlay 
        muted 
        loop 
        playsInline
      >
        <source src="/happy-gamers.mp4" type="video/mp4" />
      </video>
      <div className={styles.splashContent}>
        <div className={styles.textContainer}>
          <div className={styles.categoryContainer}>
            <img 
              src="/logo.png" 
              alt="Locals" 
              className={styles.categoryLogo}
            />
            <p className={styles.category}>Locals</p>
          </div>
          <h1 className={styles.title}>
            The One App to Bring<br />Everyone together
          </h1>
          <p className={styles.tagline}>
            Where competition brings connection
          </p>
          <button 
            onClick={handleCreateLocal}
            className={styles.createButton}
          >
            CREATE A LOCAL
          </button>
        </div>
      </div>
    </div>
  )
}
