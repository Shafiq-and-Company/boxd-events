import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from './SplashNav.module.css';

export default function SplashNav() {
  const router = useRouter();

  // Hidden login shortcut: Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        router.push('/login');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);

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
