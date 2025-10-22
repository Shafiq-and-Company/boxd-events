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
          <span className={styles.logoText}>LOCALS.GG</span>
        </div>
        
        <button 
          onClick={handleGetStarted}
          className={styles.getStartedButton}
        >
          <span className={styles.buttonText}>Get Started</span>
        </button>
      </div>
    </nav>
  );
}
