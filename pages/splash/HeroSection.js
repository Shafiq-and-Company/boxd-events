import React from 'react';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const handleGetStarted = () => {
    window.open('https://forms.gle/z9zBsz1Dyq66oqcv6', '_blank');
  };

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            <span>This is where</span>
            <br />
            <span>gaming starts</span>
          </h1>
          
          <div className={styles.divider}></div>
          
          <p className={styles.heroSubtitle}>
            Find gaming events near you or make your own to build the gaming community you want. Connect with local gamers and join fun tournaments.
          </p>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.heroImagePlaceholder}>
            Hero Image Placeholder
          </div>
        </div>
      </div>
    </section>
  );
}
