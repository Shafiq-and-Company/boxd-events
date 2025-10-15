import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './Splash.module.css'

export default function Splash() {
  const router = useRouter()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [currentStat, setCurrentStat] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const stats = [
    { number: '2,847', label: 'gaming events created this month' },
    { number: '10,000+', label: 'active gamers in your area' },
    { number: '156', label: 'new events this week' },
    { number: '1,200+', label: 'tournaments with bracketology' }
  ]

  useEffect(() => {
    setIsVisible(true)
    
    // Rotate stats every 3 seconds
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % stats.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleCreateEvent = () => {
    if (user) {
      router.push('/?tab=createEvent')
    } else {
      router.push('/login')
    }
  }

  const handleDiscoverEvents = () => {
    router.push('/?tab=discover')
  }

  return (
    <div className={styles.splashContainer}>
      <div className={`${styles.content} ${isVisible ? styles.visible : ''}`}>
        <div className={`${styles.badge} ${isVisible ? styles.badgeVisible : ''}`}>
          <span className={styles.badgeText}>Trusted by 10,000+ locals</span>
        </div>
        
        <h1 className={`${styles.title} ${isVisible ? styles.titleVisible : ''}`}>
          Gaming <span className={styles.highlight}>Locals</span> in your area
        </h1>
        
        <p className={`${styles.subtitle} ${isVisible ? styles.subtitleVisible : ''}`}>
          In-person meetups where gamers play together locally. 
          <br />
          Built-in bracketology, event management, and player matching.
        </p>
        
        <div className={`${styles.benefits} ${isVisible ? styles.benefitsVisible : ''}`}>
          <div className={styles.benefit}>
            <svg className={styles.benefitIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
              <path d="M9 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
              <path d="M9 11h6"/>
            </svg>
            <span>Built-in bracketology</span>
          </div>
          <div className={styles.benefit}>
            <svg className={styles.benefitIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4"/>
              <path d="M16 2v4"/>
              <rect width="18" height="18" x="3" y="4" rx="2"/>
              <path d="M3 10h18"/>
            </svg>
            <span>Event management tools</span>
          </div>
          <div className={styles.benefit}>
            <svg className={styles.benefitIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Player matching</span>
          </div>
        </div>
        
        <div className={`${styles.ctaSection} ${isVisible ? styles.ctaVisible : ''}`}>
          <button 
            onClick={handleCreateEvent}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`${styles.primaryButton} ${isHovering ? styles.primaryButtonHover : ''}`}
          >
            Create Your First Event
            <span className={`${styles.buttonArrow} ${isHovering ? styles.buttonArrowHover : ''}`}>→</span>
          </button>
          
          <button 
            onClick={handleDiscoverEvents}
            className={styles.secondaryButton}
          >
            Browse Local Events
          </button>
        </div>
        
        <div className={`${styles.socialProof} ${isVisible ? styles.socialProofVisible : ''}`}>
          <div className={styles.avatars}>
            <div className={`${styles.avatar} ${styles.avatar1}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={`${styles.avatar} ${styles.avatar2}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={`${styles.avatar} ${styles.avatar3}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={`${styles.avatar} ${styles.avatar4}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={`${styles.avatar} ${styles.avatar5}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
          <div className={styles.dynamicStats}>
            <p className={styles.socialProofText}>
              <strong className={styles.statNumber}>{stats[currentStat].number}</strong> {stats[currentStat].label}
            </p>
            <div className={styles.statIndicators}>
              {stats.map((_, index) => (
                <div 
                  key={index} 
                  className={`${styles.statDot} ${index === currentStat ? styles.statDotActive : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
