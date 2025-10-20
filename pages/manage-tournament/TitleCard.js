import React from 'react';
import { useRouter } from 'next/router';
import styles from './TitleCard.module.css';

const TitleCard = ({ title, eventData }) => {
  const router = useRouter();

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.headerTop}>
        <button 
          className={styles.backButton} 
          onClick={() => router.back()}
          title="Back to Event Settings"
        >
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          <span className={styles.backText}>Back to Event Settings</span>
        </button>
        <h2 className={styles.sectionTitle}>
          {title}
          {eventData && (
            <>
              <span className={styles.separator}>|</span>
              <span className={styles.eventTitleInline}>{eventData.title}</span>
              <span className={styles.separator}>|</span>
              <span className={styles.gameTitleInline}>{eventData.game_title}</span>
            </>
          )}
        </h2>
      </div>
    </div>
  );
};

export default TitleCard;
