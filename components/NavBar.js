import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar({ activeTab, onTabChange, hideMiddleNav = false }) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
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

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div 
        className={styles.logo}
        onClick={() => onTabChange && onTabChange('discover')}
      >
        BOXD
      </div>
      {!hideMiddleNav && (
        <div className={styles.navLinks}>
          <button 
            onClick={() => onTabChange && onTabChange('upcoming')} 
            className={`${styles.navLink} ${activeTab === 'upcoming' ? styles.active : ''}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => onTabChange && onTabChange('discover')} 
            className={`${styles.navLink} ${activeTab === 'discover' ? styles.active : ''}`}
          >
            Discover
          </button>
          <button 
            onClick={() => {
              if (user) {
                onTabChange && onTabChange('myEvents')
              } else {
                router.push('/login')
              }
            }} 
            className={`${styles.navLink} ${activeTab === 'myEvents' ? styles.active : ''}`}
          >
            My Events
          </button>
        </div>
      )}
      <div className={styles.profile} ref={profileRef}>
        {user ? (
          <>
            <button 
              onClick={() => {
                // TODO: Add create event functionality
                console.log('Create Event clicked')
              }}
              className={styles.createEventButton}
            >
              Create Event
            </button>
            <div 
              className={styles.profilePlaceholder}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            ></div>
            {isProfileOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownItem}>
                  <span className={styles.profileEmail}>{user.email}</span>
                </div>
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
