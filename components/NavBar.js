import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar({ activeTab, onTabChange }) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>BOXD</div>
      <div className={styles.navLinks}>
        <button 
          onClick={() => onTabChange('upcoming')} 
          className={`${styles.navLink} ${activeTab === 'upcoming' ? styles.active : ''}`}
        >
          Upcoming
        </button>
        <button 
          onClick={() => onTabChange('discover')} 
          className={`${styles.navLink} ${activeTab === 'discover' ? styles.active : ''}`}
        >
          Discover
        </button>
        <button 
          onClick={() => onTabChange('about')} 
          className={`${styles.navLink} ${activeTab === 'about' ? styles.active : ''}`}
        >
          About
        </button>
      </div>
      <div className={styles.profile} ref={profileRef}>
        {user ? (
          <>
            <span className={styles.userEmail}>{user.email}</span>
            <button 
              onClick={signOut}
              className={styles.logoutButton}
            >
              Logout
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
