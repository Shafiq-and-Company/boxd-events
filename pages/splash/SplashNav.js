import React from 'react';
import { useRouter } from 'next/router';
import styles from './SplashNav.module.css';

export default function SplashNav() {
  const router = useRouter();

  const handleGetStarted = () => {
    window.open('https://ravel-bell-55722578.figma.site/', '_blank');
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
          <span className={styles.logoText}>LOCALS.GG</span>
        </div>
        
        <button 
          onClick={handleGetStarted}
          className={styles.getStartedButton}
        >
          <span className={styles.buttonText}>Try Demo</span>
        </button>
      </div>
    </nav>
  );
}
