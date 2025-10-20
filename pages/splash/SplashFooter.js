import React from 'react';
import styles from './SplashFooter.module.css';

export default function SplashFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logo}>
        <img 
          src="/logo.png" 
          alt="BOXD" 
          className={styles.logoImage}
        />
        <span className={styles.logoText}>Locals</span>
      </div>
      
      <p className={styles.copyright}>
        © 2025 BOXD Gaming. All rights reserved.
      </p>
    </footer>
  );
}
