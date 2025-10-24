import React from 'react';
import { useRouter } from 'next/router';
import styles from './TitleCard.module.css';

const TitleCard = ({ title, eventData }) => {
  const router = useRouter();

  const handleBackClick = () => {
    router.push(`/manage-event/${eventData?.id}`);
  };

  const handleExitClick = () => {
    router.push('/');
  };

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.headerContent}>
        {/* Left side - Navigation */}
        <div className={styles.navigationSection}>
          <button className={styles.backButton} onClick={handleBackClick}>
            <span className={styles.backArrow}>←</span>
            <span className={styles.backText}>Back to Event Settings</span>
          </button>
          <div className={styles.separator}></div>
          <div className={styles.tournamentIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21l-2.99 1.42A2 2 0 0 1 4 17.66V14.66"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21l2.99 1.42A2 2 0 0 0 20 17.66V14.66"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
        </div>

        {/* Center - Tournament Info */}
        <div className={styles.tournamentInfo}>
          <div className={styles.tournamentStatus}>LIVE TOURNAMENT BRACKET</div>
          <div className={styles.tournamentTitle}>
            {eventData?.title || 'Tournament'}
            {eventData?.game_title && (
              <>
                <span className={styles.gameSeparator}>|</span>
                <span className={styles.gameTitle}>{eventData.game_title}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.actionButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span>Online</span>
          </button>
          <button className={styles.actionButton}>
            <div className={styles.autosaveIcon}></div>
            <span>Autosaving</span>
          </button>
          <button className={styles.actionButton} onClick={handleExitClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
              <path d="M8 3v4"/>
              <path d="M16 3v4"/>
              <path d="M8 11h8"/>
              <path d="M8 15h8"/>
              <path d="M8 19h8"/>
            </svg>
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleCard;
