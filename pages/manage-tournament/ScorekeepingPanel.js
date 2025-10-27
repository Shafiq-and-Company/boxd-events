import React from 'react';
import styles from './ScorekeepingPanel.module.css';

const ScorekeepingPanel = ({ eventData, participants, onMatchUpdate, isCollapsed }) => {
  return (
    <div className={`${styles.scorekeepingPanel} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.panelContent}>
        {!isCollapsed ? (
          <>
            <h2 className={styles.panelTitle}>Scorecard</h2>
            {/* Scorekeeping content will go here */}
          </>
        ) : (
          <div className={styles.collapsedContent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.editIcon}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span className={styles.collapsedText}>MAKE YOUR TOURNAMENT LIVE TO EDIT SCORE</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScorekeepingPanel;
