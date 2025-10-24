import React from 'react';
import Image from 'next/image';
import styles from './SplashFooter.module.css';

export default function SplashFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.logo}>
        <Image 
          src="/logo.png" 
          alt="BOXD" 
          className={styles.logoImage}
          width={32}
          height={32}
          quality={90}
        />
        <span className={styles.logoText}>Locals</span>
      </div>
      
      <p className={styles.copyright}>
        © 2025 BOXD Gaming. All rights reserved.
      </p>
    </footer>
  );
}
