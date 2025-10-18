import React from 'react';
import styles from './SplashFooter.module.css';

export default function SplashFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <div className={styles.logo}>
            <img 
              src="/logo.png" 
              alt="BOXD" 
              className={styles.logoImage}
            />
            <span className={styles.logoText}>Locals</span>
          </div>
          <p className={styles.footerDescription}>
            Your local gaming scene starts here. Find tournaments, meetups, and LAN parties in your area.
          </p>
        </div>
        
        <div className={styles.footerSection}>
          <h4 className={styles.footerTitle}>Product</h4>
          <ul className={styles.footerLinks}>
            <li><a href="#" className={styles.footerLink}>Create Event</a></li>
            <li><a href="#" className={styles.footerLink}>Discover Events</a></li>
            <li><a href="#" className={styles.footerLink}>Tournament Brackets</a></li>
            <li><a href="#" className={styles.footerLink}>Mobile App</a></li>
          </ul>
        </div>
        
        <div className={styles.footerSection}>
          <h4 className={styles.footerTitle}>Community</h4>
          <ul className={styles.footerLinks}>
            <li><a href="#" className={styles.footerLink}>Discord</a></li>
            <li><a href="#" className={styles.footerLink}>Twitter</a></li>
            <li><a href="#" className={styles.footerLink}>Reddit</a></li>
            <li><a href="#" className={styles.footerLink}>Support</a></li>
          </ul>
        </div>
        
        <div className={styles.footerSection}>
          <h4 className={styles.footerTitle}>Company</h4>
          <ul className={styles.footerLinks}>
            <li><a href="#" className={styles.footerLink}>About</a></li>
            <li><a href="#" className={styles.footerLink}>Privacy</a></li>
            <li><a href="#" className={styles.footerLink}>Terms</a></li>
            <li><a href="#" className={styles.footerLink}>Contact</a></li>
          </ul>
        </div>
      </div>
      
      <div className={styles.copyrightSection}>
        <p className={styles.copyright}>
          © 2025 BOXD Gaming. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
