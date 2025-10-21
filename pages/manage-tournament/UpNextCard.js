import React from 'react';
import styles from './UpNextCard.module.css';

const UpNextCard = ({ tournamentData }) => {
  return (
    <div className={styles.upNextCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Up Next</h3>
      </div>

      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4"/>
            <path d="M16 2v4"/>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <path d="M3 10h18"/>
            <path d="M8 14h.01"/>
            <path d="M12 14h.01"/>
            <path d="M16 14h.01"/>
            <path d="M8 18h.01"/>
            <path d="M12 18h.01"/>
            <path d="M16 18h.01"/>
          </svg>
        </div>
        <h3 className={styles.emptyTitle}>No Upcoming Matches</h3>
        <p className={styles.emptyDescription}>
          Tournament matches will appear here once the tournament begins and participants are seeded.
        </p>
      </div>
    </div>
  );
};

export default UpNextCard;
