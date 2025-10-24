import React from 'react';
import { useRouter } from 'next/router';
import styles from './TitlePanel.module.css';

const TitlePanel = ({ title, eventData, tournamentData }) => {
  const router = useRouter();

  const handleBackClick = () => {
    router.push(`/manage-event/${eventData?.id}`);
  };

  const handleExpandClick = () => {
    // Open current page in a new tab
    window.open(window.location.href, '_blank');
  };

  const getTournamentStatus = () => {
    if (!tournamentData?.status) return 'Not Started';
    
    return tournamentData.status.charAt(0).toUpperCase() + tournamentData.status.slice(1);
  };

  const getAllStatuses = () => {
    const statuses = ['registration', 'seeding', 'active', 'completed', 'cancelled'];
    return statuses.map(status => status.charAt(0).toUpperCase() + status.slice(1));
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
          <button className={`${styles.actionButton} ${styles.onlineButton}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span>Online</span>
          </button>
          <button 
            className={styles.actionButton}
            title={`Available statuses: ${getAllStatuses().join(', ')}`}
          >
            <div className={styles.autosaveIcon}></div>
            <span>{getTournamentStatus()}</span>
          </button>
          <button className={styles.actionButton} onClick={handleExpandClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
              <path d="M8 3v4"/>
              <path d="M16 3v4"/>
              <path d="M8 11h8"/>
              <path d="M8 15h8"/>
              <path d="M8 19h8"/>
              <path d="M21 3h-6"/>
              <path d="M21 9v-6"/>
              <path d="M21 15v6"/>
              <path d="M15 21h6"/>
            </svg>
            <span>Expand</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitlePanel;
