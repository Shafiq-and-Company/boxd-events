import React, { useState } from 'react';
import styles from './ConfigurationPanel.module.css';

const ConfigurationPanel = ({ eventData, participants, onTournamentUpdate, onSeedingUpdate, onTournamentLiveChange }) => {
  const [isTournamentLive, setIsTournamentLive] = useState(false);

  const handleToggleChange = () => {
    const newState = !isTournamentLive;
    setIsTournamentLive(newState);
    onTournamentLiveChange(newState);
  };

  return (
    <div className={`${styles.configurationPanel} ${isTournamentLive ? styles.collapsed : ''}`}>
      <div className={styles.panelContent}>
        {!isTournamentLive && (
          <>
            <h2 className={styles.panelTitle}>Configuration Panel</h2>
            
            <div className={styles.tournamentStatusSection}>
              <div className={styles.toggleContainer}>
                <label className={styles.toggleLabel}>
                  <div className={styles.labelContent}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.unlockIcon}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    <span>Tournament Live</span>
                  </div>
                  <div className={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={isTournamentLive}
                      onChange={handleToggleChange}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </div>
                </label>
              </div>
              <p className={styles.statusText}>Your Tournament is Open to Changes</p>
            </div>
            
            {/* Configuration content will go here */}
          </>
        )}
        
        {isTournamentLive && (
          <div className={styles.collapsedContent}>
            <div className={styles.toggleContainer}>
              <label className={styles.collapsedToggleLabel}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.unlockIcon}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <div className={styles.toggleWrapper}>
                  <input
                    type="checkbox"
                    checked={isTournamentLive}
                    onChange={handleToggleChange}
                    className={styles.toggleInput}
                  />
                  <span className={`${styles.toggleSlider} ${styles.collapsedToggleSlider}`}></span>
                </div>
                <span className={styles.collapsedText}>Toggle to Unlock Configuration</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPanel;
