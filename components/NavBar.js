import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar({ activeTab, onTabChange }) {
  const router = useRouter()
  const { user, signOut } = useAuth()
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
      <div className={styles.profile}>
        {user ? (
          <>
            <span className={styles.userEmail}>{user.email}</span>
            <button 
              onClick={signOut}
              className={styles.logoutButton}
            >
              Logout
            </button>
          </>
        ) : (
          <button 
            onClick={() => router.push('/login')}
            className={styles.loginButton}
          >
            Login
          </button>
        )}
        <div className={styles.profilePlaceholder}></div>
      </div>
    </nav>
  )
}
