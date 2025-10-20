import React from 'react';
import { useRouter } from 'next/router';
import styles from './TitleCard.module.css';

const TitleCard = ({ title, eventData }) => {
  const router = useRouter();

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.headerTop}>
        <div className={styles.backSection}>
          <button 
            className={styles.backButton} 
            onClick={() => router.back()}
            title="Back to Event Settings"
          >
            <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span className={styles.backText}>Back to Event Settings</span>
        </div>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {eventData && (
        <div className={styles.eventInfo}>
          <h3 className={styles.eventTitle}>{eventData.title}</h3>
          <p className={styles.eventGame}>{eventData.game_title}</p>
        </div>
      )}
    </div>
  );
};

export default TitleCard;
