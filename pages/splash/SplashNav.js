import React from 'react';
import { useRouter } from 'next/router';
import styles from './SplashNav.module.css';

export default function SplashNav() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/login');
  };

  const handleLogoClick = () => {
    router.push('/splash');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <div 
          className={styles.logo}
          onClick={handleLogoClick}
        >
          <img 
            src="/logo.png" 
            alt="BOXD" 
            className={styles.logoImage}
          />
        </div>
        
        <button 
          onClick={handleGetStarted}
          className={styles.getStartedButton}
        >
          <span className={styles.buttonText}>Get Started Free</span>
          <svg className={styles.buttonIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </nav>
  );
}
