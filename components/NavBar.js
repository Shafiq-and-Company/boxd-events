import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar({ activeTab, onTabChange, hideMiddleNav = false }) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    function handleScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 10)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTimezone = () => {
    return new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short'
    }).formatToParts(currentTime).find(part => part.type === 'timeZoneName')?.value || ''
  }

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.leftSection}>
        <div 
          className={styles.logo}
          onClick={() => router.push('/splash')}
        >
          <img 
            src="/logo.png" 
            alt="BOXD" 
            className={styles.logoImage}
          />
        </div>
      </div>
      {!hideMiddleNav && (
        <div className={styles.navLinks}>
          <button 
            onClick={() => {
              if (user) {
                onTabChange && onTabChange('discover')
              } else {
                router.push('/splash')
              }
            }} 
            className={`${styles.navLink} ${activeTab === 'discover' ? styles.active : ''}`}
          >
            <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
            <span className={styles.navText}>Discover</span>
          </button>
          <button 
            onClick={() => {
              if (user) {
                onTabChange && onTabChange('myEvents')
              } else {
                router.push('/splash')
              }
            }} 
            className={`${styles.navLink} ${activeTab === 'myEvents' ? styles.active : ''}`}
          >
            <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 9v2"/>
            </svg>
            <span className={styles.navText}>My Events</span>
          </button>
        </div>
      )}
      <div className={styles.profile} ref={profileRef}>
        {user ? (
          <>
            <div className={styles.timeDisplay}>
              <span className={styles.date}>{formatDate()}</span>
              <span className={styles.timeSeparator}>·</span>
              <span className={styles.time}>{formatTime()}</span>
              <span className={styles.timezone}>{getTimezone()}</span>
            </div>
            <button 
              onClick={() => {
                if (onTabChange) {
                  onTabChange('createEvent')
                } else {
                  router.push('/splash')
                }
              }}
              className={styles.createEventButton}
            >
              <svg className={styles.createEventIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14"/>
                <path d="M5 12h14"/>
              </svg>
              <span className={styles.createEventText}>Create Event</span>
            </button>
            <div 
              className={styles.profilePlaceholder}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            ></div>
            {isProfileOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownItem}>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileImage}>
                      <span className={styles.profileInitial}>
                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div className={styles.profileDetails}>
                      <span className={styles.profileEmail}>{user.email}</span>
                      <span className={styles.profileUsername}>
                        @{user.email ? user.email.split('@')[0] : 'user'}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange('settings')
                    } else {
                      router.push('/splash')
                    }
                    setIsProfileOpen(false)
                  }}
                  className={styles.profileSettingsButton}
                >
                  Settings
                </button>
                <button 
                  onClick={() => {
                    signOut()
                    setIsProfileOpen(false)
                  }}
                  className={styles.profileLogoutButton}
                >
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <button 
            onClick={() => router.push('/login')}
            className={styles.loginButton}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  )
}
