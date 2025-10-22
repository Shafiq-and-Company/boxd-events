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
          <div className={styles.localsSubtext}>
            <span>Locals</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h1 className={styles.heroTitle}>
            <span>Your local</span>
            <br />
            <span>gaming scene</span>
            <br />
            <span className={styles.gradientText}>STARTS HERE.</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            Find tournaments, meetups, and LAN parties in your area. Or create your own and build the gaming community you've always wanted.
          </p>

          <button className={styles.primaryButton} onClick={handleGetStarted}>
            <span>Create an Event Now</span>
          </button>
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
